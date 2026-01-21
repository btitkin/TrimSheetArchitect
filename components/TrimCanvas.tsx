import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { TrimStrip, SheetConfig, TrimZone } from '../types';

interface TrimCanvasProps {
  config: SheetConfig;
  zones: TrimZone[];
  activeZoneIds?: string[];
  showSelectionOverlay?: boolean;
}

export interface TrimCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  getExportDataURL: () => string;
}

const TrimCanvas = forwardRef<TrimCanvasHandle, TrimCanvasProps>(({ config, zones, activeZoneIds = [], showSelectionOverlay = true }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const renderCanvas = (isExport: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = config;

      // Apply Filters if active or if exporting with post-processing enabled
      const applyFilters = isExport ? config.exportPostProcessing : true;
      
      // Reset State
      ctx.restore(); 
      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // --- PASS 0: Filters ---
      if (applyFilters) {
          ctx.filter = `saturate(${config.globalSaturation * 100}%) brightness(${config.globalBrightness * 100}%)`;
      } else {
          ctx.filter = 'none';
      }

      // --- MATH SETUP ---
      const BASE_DENSITY = 512;
      const BASE_TILE_SIZE = 128;
      
      const densityTarget = config.texelDensityTarget || 512;
      const densityRatio = densityTarget / BASE_DENSITY;
      const dynamicGridSize = BASE_TILE_SIZE / densityRatio;

      const isTransparentOutline = config.renderStyle === 'outline' && config.outlineFillStyle === 'transparent';

      if (!isTransparentOutline) {
          ctx.fillStyle = '#000000'; 
          ctx.fillRect(0, 0, width, height);
      }
      
      // Draw Hazard/Void background (Global)
      if (!isTransparentOutline) {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = '#1e293b'; 
          ctx.lineWidth = 10;
          const spacing = 60;
          const maxDim = Math.max(width, height);
          for(let i = -maxDim; i < maxDim * 2; i += spacing) {
              ctx.moveTo(i, 0);
              ctx.lineTo(i - maxDim, maxDim);
          }
          ctx.stroke();
          ctx.restore();
      }

      // --- PASS 1: Render Each Zone ---
      zones.forEach(zone => {
          renderZone(ctx, zone, config, dynamicGridSize);
      });

      // --- PASS 2: Texel Density Overlay (Global) ---
      if (config.showTexelDensity) {
          drawTexelOverlay(ctx, width, height, densityTarget, dynamicGridSize);
      }

      // --- PASS 3: Active Zones Highlights (Global overlay) ---
      // Only draw selection highlights if NOT exporting AND overlay is enabled
      if (!isExport && showSelectionOverlay && activeZoneIds.length > 0) {
          // Temporarily disable filter for UI elements so they pop
          ctx.filter = 'none'; 
          
          ctx.save();
          activeZoneIds.forEach(id => {
              const activeZone = zones.find(z => z.id === id);
              if (activeZone) {
                  const zx = Math.round(activeZone.x * width);
                  const zy = Math.round(activeZone.y * height);
                  const zw = Math.round(activeZone.width * width);
                  const zh = Math.round(activeZone.height * height);

                  // High Visibility Stroke
                  // Outer Black
                  ctx.lineWidth = 6;
                  ctx.strokeStyle = '#000000';
                  ctx.strokeRect(zx, zy, zw, zh);

                  // Inner Yellow/Neon
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = '#fbbf24'; // Amber-400
                  ctx.setLineDash([10, 5]); // Dashed effect
                  ctx.strokeRect(zx, zy, zw, zh);
                  
                  // Secondary contrast dash
                  ctx.lineWidth = 4;
                  ctx.strokeStyle = '#ffffff';
                  ctx.lineDashOffset = 7;
                  ctx.setLineDash([10, 5]);
                  ctx.strokeRect(zx, zy, zw, zh);
              }
          });
          ctx.restore();
      }
      
      ctx.restore(); // End global save
  };

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getExportDataURL: () => {
        if (!canvasRef.current) return '';
        // Re-render strictly for export (no UI, specific filter settings)
        renderCanvas(true);
        const data = canvasRef.current.toDataURL('image/png');
        // Restore view
        renderCanvas(false);
        return data;
    }
  }));

  // Main Render Effect
  useEffect(() => {
    renderCanvas(false);
  }, [config, zones, activeZoneIds, showSelectionOverlay]);

  // --- Helper Drawing Functions ---

  const renderZone = (
      ctx: CanvasRenderingContext2D, 
      zone: TrimZone, 
      config: SheetConfig, 
      gridSize: number
    ) => {
      
      const zoneX = Math.round(zone.x * config.width);
      const zoneY = Math.round(zone.y * config.height);
      const zoneW = Math.round(zone.width * config.width);
      const zoneH = Math.round(zone.height * config.height);

      ctx.save();
      
      // 1. Clip to Zone Area
      ctx.beginPath();
      ctx.rect(zoneX, zoneY, zoneW, zoneH);
      ctx.clip();

      // 2. Translate to Zone Origin (Drawing inside is local to 0,0)
      ctx.translate(zoneX, zoneY);

      // 3. Clear hazard background inside zone area if not transparent
      if (config.renderStyle !== 'outline' || config.outlineFillStyle !== 'transparent') {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, zoneW, zoneH);
      }

      const isVertical = zone.layoutMode === 'vertical';
      let mainAxisPos = 0;

      zone.strips.forEach((strip) => {
          const stripMainSize = strip.height; // Logic size (Height in H, Width in V)
          const stripCrossSize = isVertical ? zoneH : zoneW;

          const segmentSize = stripCrossSize / strip.subdivisions;

          for (let i = 0; i < strip.subdivisions; i++) {
              let x, y, w, h;

              if (isVertical) {
                   // Vertical Columns
                   x = Math.round(mainAxisPos);
                   w = stripMainSize;
                   // Y Split
                   const yStart = Math.round(i * segmentSize);
                   const yEnd = i === strip.subdivisions - 1 ? zoneH : Math.round((i + 1) * segmentSize);
                   y = yStart;
                   h = yEnd - yStart;
              } else {
                   // Horizontal Rows
                   y = Math.round(mainAxisPos);
                   h = stripMainSize;
                   // X Split
                   const xStart = Math.round(i * segmentSize);
                   const xEnd = i === strip.subdivisions - 1 ? zoneW : Math.round((i + 1) * segmentSize);
                   x = xStart;
                   w = xEnd - xStart;
              }

              const segColor = strip.subdivisionColors?.[i] || strip.baseColor;
              drawStripSegment(ctx, config, strip, x, y, w, h, segColor, gridSize);
          }
          mainAxisPos += stripMainSize;
      });

      // 4. Draw Zone Guides/Labels (Post-fill)
      mainAxisPos = 0;
      zone.strips.forEach((strip) => {
          const stripMainSize = strip.height;
          const stripCrossSize = isVertical ? zoneH : zoneW;
          const segmentSize = stripCrossSize / strip.subdivisions;

          // Grid Lines
          if (config.renderStyle !== 'outline') {
              ctx.lineWidth = 1;
              const gridColor = config.stripGridColor || 'rgba(0,0,0,0.5)';
              
              if (isVertical) {
                   // Vertical Separator
                   ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                   const lineX = Math.round(mainAxisPos + stripMainSize) - 0.5;
                   ctx.beginPath();
                   ctx.moveTo(lineX, 0);
                   ctx.lineTo(lineX, zoneH);
                   ctx.stroke();

                   // Sub-cuts
                   if (strip.subdivisions > 1) {
                      ctx.beginPath();
                      ctx.setLineDash([5, 3]); 
                      ctx.strokeStyle = gridColor; 
                      for(let i = 1; i < strip.subdivisions; i++) {
                          const y = Math.round(i * segmentSize) - 0.5;
                          ctx.moveTo(mainAxisPos, y);
                          ctx.lineTo(mainAxisPos + stripMainSize, y);
                      }
                      ctx.stroke();
                      ctx.setLineDash([]);
                   }
              } else {
                   // Horizontal Separator
                   ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
                   const lineY = Math.round(mainAxisPos + stripMainSize) - 0.5; 
                   ctx.beginPath();
                   ctx.moveTo(0, lineY);
                   ctx.lineTo(zoneW, lineY);
                   ctx.stroke();

                   // Sub-cuts
                   if (strip.subdivisions > 1) {
                      ctx.beginPath();
                      ctx.setLineDash([5, 3]); 
                      ctx.strokeStyle = gridColor; 
                      for(let i = 1; i < strip.subdivisions; i++) {
                          const x = Math.round(i * segmentSize) - 0.5;
                          ctx.moveTo(x, mainAxisPos);
                          ctx.lineTo(x, mainAxisPos + stripMainSize);
                      }
                      ctx.stroke();
                      ctx.setLineDash([]);
                   }
              }
          }

          // Labels
          drawTechnicalLabel(ctx, strip, Math.round(mainAxisPos), stripMainSize, isVertical ? stripMainSize : zoneW, config.renderStyle, isVertical, zoneH);

          mainAxisPos += stripMainSize;
      });

      // Zone Border Outline (for structure visibility)
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.strokeRect(0, 0, zoneW, zoneH);

      ctx.restore();
  };

  const drawStripSegment = (ctx: CanvasRenderingContext2D, config: SheetConfig, strip: TrimStrip, x: number, y: number, w: number, h: number, color: string, gridSize: number) => {
    ctx.save();
    
    if (config.renderStyle === 'outline') {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, h);
        const borderThickness = config.outlineThickness || 4;
        const effectiveThickness = Math.min(borderThickness, Math.min(w, h) / 2);
        const innerX = x + effectiveThickness;
        const innerY = y + effectiveThickness;
        const innerW = w - (effectiveThickness * 2);
        const innerH = h - (effectiveThickness * 2);

        if (config.outlineFillStyle === 'transparent') {
            ctx.clearRect(innerX, innerY, innerW, innerH);
        } else {
            ctx.fillStyle = '#000000';
            ctx.fillRect(innerX, innerY, innerW, innerH);
        }
    } else {
        ctx.fillStyle = color;
        switch (strip.fillType) {
            case 'noise':
            drawNoise(ctx, x, y, w, h, color);
            break;
            case 'gradient_v':
            drawVerticalGradient(ctx, x, y, w, h, color);
            break;
            case 'checker':
            drawChecker(ctx, x, y, w, h, color, gridSize);
            break;
            case 'flat':
            default:
            ctx.fillRect(x, y, w, h);
            break;
        }

        if (config.renderStyle === 'gradient') {
            const g = ctx.createLinearGradient(x, y, x, y + h);
            g.addColorStop(0, 'rgba(255,255,255,0.1)'); 
            g.addColorStop(0.5, 'rgba(0,0,0,0)');
            g.addColorStop(1, 'rgba(0,0,0,0.3)'); 
            ctx.fillStyle = g;
            ctx.fillRect(x, y, w, h);
        }
    }
    ctx.restore();
  };

  const drawTexelOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number, density: number, tileSize: number) => {
      const tilePhysicalMeters = tileSize / density;
      let labelText = '';
      if (tilePhysicalMeters >= 1) {
          labelText = `${tilePhysicalMeters.toFixed(2)}m`;
      } else {
          labelText = `${(tilePhysicalMeters * 100).toFixed(2)}cm`;
      }
      
      ctx.save();
      
      // Pass 1: Light Overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      for (let y = 0; y < height; y += tileSize) {
          for (let x = 0; x < width; x += tileSize) {
              if (((x / tileSize) + (y / tileSize)) % 2 === 0) {
                  const w = Math.min(tileSize, width - x);
                  const h = Math.min(tileSize, height - y);
                  ctx.fillRect(x, y, w, h);
              }
          }
      }

      // Pass 2: Dark Overlay
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let y = 0; y < height; y += tileSize) {
          for (let x = 0; x < width; x += tileSize) {
              if (((x / tileSize) + (y / tileSize)) % 2 !== 0) {
                  const w = Math.min(tileSize, width - x);
                  const h = Math.min(tileSize, height - y);
                  ctx.fillRect(x, y, w, h);
              }
          }
      }

      // Pass 4: Info Overlay
      const sheetPhysicalWidth = (width / density).toFixed(2);
      const sheetPhysicalHeight = (height / density).toFixed(2);
      
      ctx.restore();
      ctx.save();
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = '#fbbf24'; 
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'right';
      
      const infoText = `SHEET: ${sheetPhysicalWidth}m x ${sheetPhysicalHeight}m`;
      const densityText = `@ ${density} px/m`;
      const gridText = `GRID: ${labelText} (${Math.round(tileSize)}px)`;

      const padding = 10;
      const lineHeight = 16;
      
      ctx.strokeText(infoText, width - padding, padding);
      ctx.fillText(infoText, width - padding, padding);

      ctx.strokeText(densityText, width - padding, padding + lineHeight);
      ctx.fillText(densityText, width - padding, padding + lineHeight);

      ctx.strokeText(gridText, width - padding, padding + lineHeight * 2);
      ctx.fillText(gridText, width - padding, padding + lineHeight * 2);
      
      ctx.restore();
  };

  const drawNoise = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    
    // Create local noise pattern
    // Optimization: Draw to a small offscreen canvas if performance issues arise, but explicit pixel manipulation is fine for this scale usually.
    // However, getImageData is strictly local.
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 20;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, x, y);
  };

  const drawVerticalGradient = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) => {
    const gradient = ctx.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  };

  const drawChecker = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, size: number) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    const safeSize = Math.max(2, size);
    for (let row = 0; row < h / safeSize; row++) {
        for (let col = 0; col < w / safeSize; col++) {
            if ((row + col) % 2 === 0) {
                ctx.fillRect(x + col * safeSize, y + row * safeSize, safeSize, Math.min(safeSize, h - row * safeSize));
            }
        }
    }
  };

  const drawTechnicalLabel = (ctx: CanvasRenderingContext2D, strip: TrimStrip, pos: number, size: number, crossSize: number, style: string, isVertical: boolean, zoneH: number) => {
    const fontSize = Math.min(32, Math.max(16, size * 0.4));
    const padding = 10;
    
    const textColor = style === 'outline' ? '#888888' : '#FFFFFF';
    const strokeColor = style === 'outline' ? '#000000' : 'rgba(0,0,0,0.8)';

    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontSize}px monospace`;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 4;

    const centerText = `${size}px`;
    const centerTextWidth = ctx.measureText(centerText).width;
    
    let centerX, centerY;
    
    if (isVertical) {
        centerX = pos + (size / 2);
        centerY = zoneH / 2;
        
        if (size < centerTextWidth) {
             ctx.save();
             ctx.translate(centerX, centerY);
             ctx.rotate(-Math.PI / 2);
             ctx.strokeText(centerText, 0, 0);
             ctx.fillText(centerText, 0, 0);
             ctx.restore();
        } else {
             ctx.strokeText(centerText, centerX - (centerTextWidth/2), centerY);
             ctx.fillText(centerText, centerX - (centerTextWidth/2), centerY);
        }
    } else {
        centerX = crossSize / 2;
        centerY = pos + (size / 2);
        ctx.strokeText(centerText, centerX - (centerTextWidth/2), centerY);
        ctx.fillText(centerText, centerX - (centerTextWidth/2), centerY);
    }

    if (size > 32) {
        ctx.font = `bold 20px sans-serif`;
        ctx.fillStyle = style === 'outline' ? '#666666' : 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 3;
        
        if (isVertical) {
            ctx.save();
            ctx.translate(pos + size/2, padding + 20);
            if (size < 60) ctx.rotate(-Math.PI/2);
            ctx.textAlign = 'center';
            ctx.strokeText(strip.name, 0, 0);
            ctx.fillText(strip.name, 0, 0);
            ctx.restore();
        } else {
            ctx.textAlign = 'left';
            ctx.strokeText(strip.name, padding, pos + 20);
            ctx.fillText(strip.name, padding, pos + 20);
        }
    }
  };

  const checkerboardStyle = {
      backgroundImage: `
        linear-gradient(45deg, #1e293b 25%, transparent 25%),
        linear-gradient(-45deg, #1e293b 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #1e293b 75%),
        linear-gradient(-45deg, transparent 75%, #1e293b 75%)
      `,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
      backgroundColor: '#0f172a'
  };

  return (
    <div 
        className={`relative shadow-2xl border border-slate-700 overflow-hidden rounded-sm select-none`}
        style={config.renderStyle === 'outline' && config.outlineFillStyle === 'transparent' ? checkerboardStyle : { backgroundColor: '#0f172a' }}
    >
        <div className="absolute top-0 left-0 bg-black/50 text-white text-xs px-2 py-1 pointer-events-none z-10">
            {config.width} x {config.height} Preview
        </div>
      <canvas
        ref={canvasRef}
        width={config.width}
        height={config.height}
        className="w-full h-auto block"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
});

TrimCanvas.displayName = 'TrimCanvas';

export default TrimCanvas;
