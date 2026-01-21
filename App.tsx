import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrimStrip, SheetConfig, ValidationResult, TrimZone, LayoutPresetType } from './types';
import { DEFAULT_CONFIG, PRESETS, RESOLUTIONS, COLORS, DEFAULT_ZONES, generateRandomFullRangeColor, generateDistributedColors, generateDefaultZoneStrips, TEXEL_DENSITY_OPTIONS, ZONE_TEMPLATES, ZoneTemplateType, generateZoneTemplateStrips } from './constants';
import TrimCanvas, { TrimCanvasHandle } from './components/TrimCanvas';
import StripEditor from './components/StripEditor';
import { HelpModal, Tooltip } from './components/HelpSystem';
import { Download, Plus, AlertTriangle, FileJson, Info, Maximize, Shuffle, Layers, Palette, Eye, Sliders, Droplet, Grid, Settings, Wand2, ArrowRightLeft, MoveVertical, MoveHorizontal, LayoutTemplate, RotateCcw, ZoomIn, ZoomOut, MousePointer2, CheckSquare, LayoutList, Sun, Gauge, FileCheck, Scan, SquareDashed, Grid3x3, BookOpen, Upload, Ruler, DraftingCompass } from 'lucide-react';
import trimSheetLogo from './assets/TrimSheetArchitectLogo.png';

// AppLogo with robust error handling
const AppLogo = ({ className }: { className?: string }) => {
    const [imgError, setImgError] = useState(false);

    // If PNG fails to load, render a professional placeholder instead of a broken image icon
    if (imgError) {
        return (
            <div className={`${className} flex items-center justify-center bg-slate-800 border border-slate-700 rounded text-blue-500 shadow-sm overflow-hidden relative`}>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
                <Ruler size="60%" strokeWidth={1.5} />
            </div>
        );
    }

    return (
        <img
            src={trimSheetLogo}
            alt="Trim Sheet Architect"
            className={`${className} object-contain`}
            onError={() => {
                console.warn("Logo PNG not found at ./assets/TrimSheetArchitectLogo.png. Using fallback icon.");
                setImgError(true);
            }}
        />
    );
};

const App: React.FC = () => {
    const [config, setConfig] = useState<SheetConfig>(DEFAULT_CONFIG);
    const [zones, setZones] = useState<TrimZone[]>(DEFAULT_ZONES);

    // Changed activeZoneId (string) to activeZoneIds (array) for multi-selection
    const [activeZoneIds, setActiveZoneIds] = useState<string[]>([DEFAULT_ZONES[0].id]);

    const [selectedPresetId, setSelectedPresetId] = useState<string>('mixed_standard');
    const [maxRandomStrips, setMaxRandomStrips] = useState<number>(8);
    const [selectedZoneTemplate, setSelectedZoneTemplate] = useState<ZoneTemplateType>('classic');
    const [isLoading, setIsLoading] = useState(true);
    const [showHelpModal, setShowHelpModal] = useState(false);

    // Viewport State
    const [zoom, setZoom] = useState(0.5);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [showSelectionOverlay, setShowSelectionOverlay] = useState(true);

    const canvasRef = useRef<TrimCanvasHandle>(null);
    const viewportRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2200);
        return () => clearTimeout(timer);
    }, []);

    // --- Logic: Layout & Zones ---

    const generateLayout = (type: LayoutPresetType) => {
        let newZones: TrimZone[] = [];

        const createZone = (id: string, name: string, x: number, y: number, w: number, h: number, mode: 'horizontal' | 'vertical', seed: number): TrimZone => {
            // Calculate approximate pixel height/width to give smart defaults
            const zonePxSize = mode === 'vertical' ? w * config.width : h * config.height;

            return {
                id, name, x, y, width: w, height: h, layoutMode: mode,
                // Use helper to populate with template strips instead of empty array
                strips: generateDefaultZoneStrips(zonePxSize, seed)
            };
        };

        switch (type) {
            case 'single':
                newZones = [createZone('main', 'Main Layout', 0, 0, 1, 1, 'horizontal', 0)];
                break;
            case 'quad':
                newZones = [
                    createZone('tl', 'Top Left', 0, 0, 0.5, 0.5, 'horizontal', 0),
                    createZone('tr', 'Top Right', 0.5, 0, 0.5, 0.5, 'horizontal', 1),
                    createZone('bl', 'Bot Left', 0, 0.5, 0.5, 0.5, 'vertical', 2),
                    createZone('br', 'Bot Right', 0.5, 0.5, 0.5, 0.5, 'vertical', 3),
                ];
                break;
            case 'split_h': // Top/Bottom
                newZones = [
                    createZone('top', 'Top Half', 0, 0, 1, 0.5, 'horizontal', 0),
                    createZone('bot', 'Bottom Half', 0, 0.5, 1, 0.5, 'horizontal', 1),
                ];
                break;
            case 'split_v': // Left/Right
                newZones = [
                    createZone('left', 'Left Half', 0, 0, 0.5, 1, 'vertical', 0),
                    createZone('right', 'Right Half', 0.5, 0, 0.5, 1, 'vertical', 1),
                ];
                break;
            case 'six_pack': // 2 Rows, 3 Cols (2x3 Grid)
                for (let r = 0; r < 2; r++) {
                    for (let c = 0; c < 3; c++) {
                        const id = `zp_${r}_${c}`;
                        newZones.push(createZone(
                            id,
                            `Zone R${r + 1}:C${c + 1}`,
                            c * (1 / 3),
                            r * 0.5,
                            1 / 3,
                            0.5,
                            'vertical',
                            r * 3 + c
                        ));
                    }
                }
                break;
            case 'grid_9': // 3x3 Grid
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        const id = `g9_${r}_${c}`;
                        newZones.push(createZone(
                            id,
                            `Grid ${r + 1}-${c + 1}`,
                            c * (1 / 3),
                            r * (1 / 3),
                            1 / 3,
                            1 / 3,
                            'vertical',
                            r * 3 + c
                        ));
                    }
                }
                break;
        }
        setZones(newZones);
        setActiveZoneIds([]); // Deselect all on new layout as requested
        setSelectedPresetId('custom');
        // Reset View
        setZoom(0.5);
        setPan({ x: 0, y: 0 });
    };

    // Helper to get the primary active zone (for display in editor)
    const primaryActiveZone = useMemo(() =>
        activeZoneIds.length > 0
            ? zones.find(z => z.id === activeZoneIds[0])
            : null
        , [zones, activeZoneIds]);

    const validation: ValidationResult = useMemo(() => {
        const results: ValidationResult['zoneResults'] = {};
        let allValid = true;

        zones.forEach(zone => {
            const totalSize = zone.strips.reduce((sum, strip) => sum + strip.height, 0);
            const pixelHeight = zone.height * config.height;
            const pixelWidth = zone.width * config.width;

            const targetSize = zone.layoutMode === 'vertical' ? pixelWidth : pixelHeight;

            const isValid = Math.abs(totalSize - targetSize) < 1;
            if (!isValid) allValid = false;

            results[zone.id] = {
                currentSize: Math.round(totalSize),
                targetSize: Math.round(targetSize),
                remaining: Math.round(targetSize - totalSize),
                isValid
            };
        });

        return {
            isValid: allValid,
            zoneResults: results
        };
    }, [zones, config.height, config.width]);

    const handleResolutionChange = (newSize: number) => {
        const ratio = newSize / config.height;

        const newZones = zones.map(z => ({
            ...z,
            strips: z.strips.map(s => ({ ...s, height: Math.max(1, Math.round(s.height * ratio)) }))
        }));

        setZones(newZones);
        setConfig({ ...config, width: newSize, height: newSize });
    };

    const handleLoadPreset = (presetId: string) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const deepCopiedZones = preset.zones.map(z => ({
            ...z,
            strips: z.strips.map(s => ({
                ...s,
                subdivisionColors: [...s.subdivisionColors]
            }))
        }));

        setConfig({ ...preset.config });
        setZones(deepCopiedZones);
        setActiveZoneIds([deepCopiedZones[0].id]);
        setSelectedPresetId(presetId);
    };

    // --- Zoom & Pan Handlers ---

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const scaleAmount = -e.deltaY * 0.001;
            setZoom(z => Math.min(5, Math.max(0.2, z * (1 + scaleAmount))));
        } else {
            const scaleAmount = -e.deltaY * 0.001;
            setZoom(z => Math.min(5, Math.max(0.2, z + scaleAmount * 2)));
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        // Allow drag on middle mouse or if clicking blank space (not implemented via canvas hit test yet for drag)
        if (e.button === 1 || e.button === 0) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            setPan({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    const handleCanvasClick = (e: React.MouseEvent) => {
        if (isDragging && (Math.abs(e.clientX - dragStart.x - pan.x) > 5 || Math.abs(e.clientY - dragStart.y - pan.y) > 5)) {
            // It was a drag operation, ignore click
            return;
        }

        const target = e.currentTarget as HTMLDivElement;
        const rect = target.getBoundingClientRect();
        const x = (e.clientX - rect.left) / (rect.width);
        const y = (e.clientY - rect.top) / (rect.height);

        // Find which zone was clicked
        const clickedZone = zones.find(z =>
            x >= z.x && x <= z.x + z.width &&
            y >= z.y && y <= z.y + z.height
        );

        if (clickedZone) {
            // Toggle Logic
            if (activeZoneIds.includes(clickedZone.id)) {
                // Deselect if already selected (unless it's the only one, maybe? No, allow full deselect or min 0)
                // Requirement: "deselect if clicked again"
                setActiveZoneIds(prev => prev.filter(id => id !== clickedZone.id));
            } else {
                // Add to selection (Multi-select)
                // Requirement: "allow user to select more than one"
                setActiveZoneIds(prev => [...prev, clickedZone.id]);
            }
        } else {
            // Clicked outside zones (background) -> Clear selection?
            setActiveZoneIds([]);
        }
    };

    // --- Generators & Synchronizers ---

    // Shared logic for "Projecting" a global strip list onto the selected zones
    // This creates the "One Big Sheet" effect across multiple selected zones.
    const applyProjectedLayout = (globalStrips: TrimStrip[]) => {
        const globalHeight = config.height;
        const globalWidth = config.width;

        // Determine orientation based on the Primary Zone (or first selected)
        const masterZone = zones.find(z => z.id === activeZoneIds[0]);
        const isVertical = masterZone?.layoutMode === 'vertical';

        // Map global strips to segments [start, end]
        let currentPos = 0;
        const globalSegments = globalStrips.map(s => {
            const seg = { ...s, start: currentPos, end: currentPos + s.height };
            currentPos += s.height;
            return seg;
        });

        const newZones = zones.map(z => {
            if (activeZoneIds.includes(z.id)) {
                // Determine if we should apply logic based on this zone's orientation
                // Ideally, if a user mixes H and V zones in selection, this might behave oddly,
                // but we follow the master zone's logic or the zone's own?
                // Let's assume projected layout only works if orientations match, or we force it.
                // Here we will slice based on the MASTER orientation.

                let zStart, zEnd;

                if (isVertical) {
                    // Projecting along X axis
                    zStart = Math.round(z.x * globalWidth);
                    zEnd = Math.round((z.x + z.width) * globalWidth);
                } else {
                    // Projecting along Y axis
                    zStart = Math.round(z.y * globalHeight);
                    zEnd = Math.round((z.y + z.height) * globalHeight);
                }

                // Find strips that intersect with this zone's range
                const localStrips: TrimStrip[] = [];

                globalSegments.forEach(seg => {
                    const intersectionStart = Math.max(seg.start, zStart);
                    const intersectionEnd = Math.min(seg.end, zEnd);

                    if (intersectionEnd > intersectionStart) {
                        // We have an overlap
                        const h = intersectionEnd - intersectionStart;
                        // Clone strip properties but adjust height
                        localStrips.push({
                            ...seg,
                            id: Math.random().toString(36).substr(2, 9), // New ID for local instance
                            height: h,
                            // name: `${seg.name} (Part)`
                        });
                    }
                });

                return { ...z, strips: localStrips };
            }
            return z;
        });
        setZones(newZones);
        setSelectedPresetId('custom');
    };

    const handleApplyZoneTemplate = () => {
        const masterZone = zones.find(z => z.id === activeZoneIds[0]);
        if (!masterZone) return;

        // If multiple zones are selected, generate ONE global template layout and slice it
        if (activeZoneIds.length > 1) {
            const isVertical = masterZone.layoutMode === 'vertical';
            const globalSize = isVertical ? config.width : config.height;

            // Generate full sheet template
            const globalStrips = generateZoneTemplateStrips(selectedZoneTemplate, globalSize, Math.floor(Math.random() * 100));
            applyProjectedLayout(globalStrips);
            return;
        }

        // Single Zone Logic (Standard)
        const targetTotal = masterZone.layoutMode === 'vertical'
            ? masterZone.width * config.width
            : masterZone.height * config.height;

        const newStrips = generateZoneTemplateStrips(selectedZoneTemplate, targetTotal, Math.floor(Math.random() * 100));

        const newZones = zones.map(z => {
            if (activeZoneIds.includes(z.id)) {
                return { ...z, strips: newStrips };
            }
            return z;
        });
        setZones(newZones);
        setSelectedPresetId('custom');
    };

    const handleRandomize = () => {
        const masterZone = zones.find(z => z.id === activeZoneIds[0]);
        if (!masterZone) return;

        // Use Global Height/Width if multi-select to ensure full coverage possibilities
        let targetTotal;
        if (activeZoneIds.length > 1) {
            targetTotal = masterZone.layoutMode === 'vertical' ? config.width : config.height;
        } else {
            targetTotal = masterZone.layoutMode === 'vertical'
                ? masterZone.width * config.width
                : masterZone.height * config.height;
        }

        const newStrips: TrimStrip[] = [];
        let currentTotal = 0;

        // Updated weights including 1024 for better large-area fill
        const weightedOptions = [
            { size: 1024, weight: 2 },
            { size: 512, weight: 4 },
            { size: 256, weight: 5 },
            { size: 128, weight: 4 },
            { size: 64, weight: 2 },
            { size: 32, weight: 1 }
        ];
        let stripCount = 0;

        // Generation Logic with Limit
        while (currentTotal < targetTotal) {
            const remaining = targetTotal - currentTotal;
            const slotsLeft = maxRandomStrips - stripCount;

            // Stop if we hit the limit
            if (slotsLeft === 1) {
                const baseColor = COLORS[stripCount % COLORS.length];
                // If the final strip is very large (e.g. > 512), give it some subdivision to make it interesting
                // instead of a giant solid block.
                let subs = 1;
                if (remaining >= 512 && Math.random() > 0.5) subs = 4;
                else if (remaining >= 256 && Math.random() > 0.5) subs = 2;

                const subColors = Array(subs).fill('').map(() => Math.random() > 0.5 ? baseColor : COLORS[Math.floor(Math.random() * COLORS.length)]);

                newStrips.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: `Strip_${stripCount + 1}_Fill`,
                    height: remaining,
                    fillType: 'flat',
                    baseColor: baseColor,
                    subdivisions: subs,
                    subdivisionColors: subColors
                });
                break;
            }

            // Smart Filtering to avoid creating situations where we run out of slots with huge space left
            // or run out of space with slots left.

            let validOptions = weightedOptions.filter(opt => opt.size <= remaining);

            // HEURISTIC: If we have very few slots left but A LOT of space, force larger strips.
            // e.g. 1500px left, 2 slots. Avg = 750. We shouldn't pick 64px.
            const avgPixelsPerSlot = remaining / slotsLeft;

            if (avgPixelsPerSlot > 400) {
                // Force >= 256
                const largeOpts = validOptions.filter(opt => opt.size >= 256);
                if (largeOpts.length > 0) validOptions = largeOpts;
            } else if (avgPixelsPerSlot > 150) {
                // Force >= 64
                const medOpts = validOptions.filter(opt => opt.size >= 64);
                if (medOpts.length > 0) validOptions = medOpts;
            }

            if (validOptions.length === 0) {
                // Fallback: just fill remaining
                const baseColor = COLORS[stripCount % COLORS.length];
                newStrips.push({ id: Math.random().toString(36).substr(2, 9), name: `Fill_${remaining}`, height: remaining, fillType: 'flat', baseColor: baseColor, subdivisions: 1, subdivisionColors: [baseColor] });
                break;
            }

            const totalWeight = validOptions.reduce((sum, opt) => sum + opt.weight, 0);
            let random = Math.random() * totalWeight;
            let selectedSize = validOptions[0].size;
            for (const opt of validOptions) { random -= opt.weight; if (random <= 0) { selectedSize = opt.size; break; } }

            let subs = 1;
            if (Math.random() > 0.7) {
                const subOptions = [2, 4, 8];
                subs = subOptions[Math.floor(Math.random() * subOptions.length)];
            }
            const baseColor = COLORS[stripCount % COLORS.length];
            let subColors = [baseColor];
            if (subs > 1) {
                subColors = Array(subs).fill('').map(() => Math.random() > 0.5 ? baseColor : COLORS[Math.floor(Math.random() * COLORS.length)]);
            }
            newStrips.push({ id: Math.random().toString(36).substr(2, 9), name: `Strip_${stripCount + 1}_${selectedSize}px`, height: selectedSize, fillType: 'flat', baseColor: baseColor, subdivisions: subs, subdivisionColors: subColors });
            currentTotal += selectedSize;
            stripCount++;
        }

        if (activeZoneIds.length > 1) {
            applyProjectedLayout(newStrips);
        } else {
            // Single Zone: Apply directly
            const newZones = zones.map(z => {
                if (activeZoneIds.includes(z.id)) {
                    return {
                        ...z,
                        strips: newStrips.map(s => ({ ...s, subdivisionColors: [...s.subdivisionColors] }))
                    };
                }
                return z;
            });
            setZones(newZones);
            setSelectedPresetId('custom');
        }
    };

    const handleUniqueColors = () => {
        const masterZone = zones.find(z => z.id === activeZoneIds[0]);
        if (!masterZone) return;

        let totalSlots = 0;
        masterZone.strips.forEach(s => totalSlots += (s.subdivisions > 1 ? s.subdivisions : 1));

        // Use a random offset to ensure unique palettes each time
        const hueOffset = Math.floor(Math.random() * 360);
        const palette = generateDistributedColors(totalSlots, hueOffset);
        // Shuffle
        for (let i = palette.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [palette[i], palette[j]] = [palette[j], palette[i]];
        }

        let colorIndex = 0;
        const coloredStrips = masterZone.strips.map(strip => {
            if (strip.subdivisions > 1) {
                const subColors = [];
                for (let i = 0; i < strip.subdivisions; i++) {
                    subColors.push(palette[colorIndex % palette.length]);
                    colorIndex++;
                }
                return { ...strip, baseColor: subColors[0], subdivisionColors: subColors };
            } else {
                const col = palette[colorIndex % palette.length];
                colorIndex++;
                return { ...strip, baseColor: col, subdivisionColors: [col] };
            }
        });

        const newZones = zones.map(z => {
            if (activeZoneIds.includes(z.id)) {
                return {
                    ...z,
                    strips: coloredStrips.map(s => ({ ...s, subdivisionColors: [...s.subdivisionColors] }))
                };
            }
            return z;
        });
        setZones(newZones);
    };

    const handleOrientationChange = (mode: 'horizontal' | 'vertical') => {
        const newZones = zones.map(z => {
            if (activeZoneIds.includes(z.id)) {
                return { ...z, layoutMode: mode };
            }
            return z;
        });
        setZones(newZones);
    };

    // --- CRUD Operations (Multi-Select Compatible) ---

    const handleAddStrip = () => {
        if (!primaryActiveZone) return;

        // Create new strip based on primary zone state
        const baseColor = COLORS[primaryActiveZone.strips.length % COLORS.length];
        const newStrip: TrimStrip = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Strip_${primaryActiveZone.strips.length + 1}`,
            height: 128,
            fillType: 'flat',
            baseColor: baseColor,
            subdivisions: 1,
            subdivisionColors: [baseColor]
        };

        // Add this strip to ALL selected zones
        const newZones = zones.map(z => {
            if (activeZoneIds.includes(z.id)) {
                return { ...z, strips: [...z.strips, newStrip] };
            }
            return z;
        });
        setZones(newZones);
        setSelectedPresetId('custom');
    };

    const handleFillRemaining = () => {
        if (!primaryActiveZone) return;
        const val = validation.zoneResults[primaryActiveZone.id];
        if (val.remaining <= 0) return;

        const newStrip: TrimStrip = {
            id: Math.random().toString(36).substr(2, 9),
            name: `Reserve_Fill`,
            height: val.remaining,
            fillType: 'checker',
            baseColor: '#333333',
            subdivisions: 1,
            subdivisionColors: ['#333333']
        };

        // Add to all selected
        const newZones = zones.map(z => {
            if (activeZoneIds.includes(z.id)) {
                return { ...z, strips: [...z.strips, newStrip] };
            }
            return z;
        });
        setZones(newZones);
        setSelectedPresetId('custom');
    };

    const handleUpdateStrip = (id: string, updates: Partial<TrimStrip>) => {
        const newZones = zones.map(z => {
            if (!activeZoneIds.includes(z.id)) return z;
            return {
                ...z,
                strips: z.strips.map(s => {
                    if (s.id !== id) return s;

                    // Logic: If 'baseColor' updates, we must sync 'subdivisionColors' unless they are explicitly being set too.
                    const newStrip = { ...s, ...updates };

                    if (updates.baseColor && !updates.subdivisionColors) {
                        newStrip.subdivisionColors = Array(newStrip.subdivisions).fill(updates.baseColor);
                    }

                    return newStrip;
                })
            };
        });
        setZones(newZones);
        setSelectedPresetId('custom');
    };

    const handleRemoveStrip = (id: string) => {
        const newZones = zones.map(z => {
            if (!activeZoneIds.includes(z.id)) return z;
            return { ...z, strips: z.strips.filter(s => s.id !== id) };
        });
        setZones(newZones);
        setSelectedPresetId('custom');
    };

    const handleMoveStrip = (index: number, direction: -1 | 1) => {
        const newZones = zones.map(z => {
            if (!activeZoneIds.includes(z.id)) return z;

            const newStrips = [...z.strips];
            const targetIndex = index + direction;
            if (targetIndex < 0 || targetIndex >= newStrips.length) return z;

            [newStrips[index], newStrips[targetIndex]] = [newStrips[targetIndex], newStrips[index]];
            return { ...z, strips: newStrips };
        });
        setZones(newZones);
        setSelectedPresetId('custom');
    };

    const handleExportPNG = () => {
        // Use the imperative handle to get the correct data
        // This allows us to handle the "export post processing" logic inside the canvas component
        const dataUrl = canvasRef.current?.getExportDataURL();
        if (!dataUrl) return;

        const link = document.createElement('a');
        link.download = `${config.name}.png`;
        link.href = dataUrl;
        link.click();
    };

    const handleExportJSON = () => {
        const data = { config, zones, exportedAt: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = `${config.name}.json`;
        link.href = URL.createObjectURL(blob);
        link.click();
    };

    const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const raw = event.target?.result as string;
                const data = JSON.parse(raw);

                // Basic Validation
                if (data.config && data.zones) {
                    setConfig(data.config);
                    setZones(data.zones);
                    // Reset Selection to avoid ghosting
                    setActiveZoneIds([]);
                } else {
                    alert("Invalid Trim Sheet JSON file format.");
                }
            } catch (err) {
                console.error(err);
                alert("Failed to parse JSON file.");
            }
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    // --- Render ---

    return (
        <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans relative select-none">

            {/* Help Modal */}
            <HelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />

            {/* Hidden File Input for Import */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportJSON}
                className="hidden"
                accept=".json"
            />

            {/* LOADING SCREEN */}
            <div className={`fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center transition-opacity duration-1000 ${isLoading ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`flex flex-col items-center justify-center w-full h-full transition-all duration-700 ${isLoading ? 'scale-100 translate-y-0' : 'scale-90 -translate-y-10'}`}>
                    <AppLogo className="w-2/3 max-w-4xl h-auto mb-6 drop-shadow-[0_0_30px_rgba(37,99,235,0.4)]" />
                    <p className="text-slate-500 font-mono text-sm">Initializing environment...</p>
                </div>
            </div>

            {/* Header */}
            <header className="h-14 border-b border-slate-800 bg-slate-900 flex items-center px-6 shrink-0 z-10 justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative text-blue-500">
                        <DraftingCompass size={24} strokeWidth={2} />
                    </div>
                    <h1 className="font-bold text-xl tracking-tight text-slate-100 hidden md:block">Trim Sheet Architect</h1>
                    <span className="text-xs font-normal text-slate-500 border border-slate-700 rounded px-1.5 py-0.5 ml-1">v2.5.0</span>
                    <a href="https://www.artstation.com/bartosztitkin" target="_blank" rel="noopener noreferrer" className="text-xs font-normal text-slate-500 hover:text-slate-300 transition-colors ml-1">by Bartosz Titkin</a>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">

                {/* LEFT SIDEBAR */}
                <aside className="w-[420px] flex flex-col border-r border-slate-800 bg-slate-900/50 backdrop-blur-sm z-10 overflow-y-auto overflow-x-hidden custom-scrollbar p-5 gap-6">
                    {/* Project */}
                    <div>
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                            <Settings size={14} /> Project
                            <Tooltip text="Basic project settings. Name is used for export filenames." side="right" />
                        </h2>
                        <div className="space-y-3 bg-slate-800/30 p-4 rounded border border-slate-800/50">
                            <input
                                type="text" value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500 transition-colors"
                                placeholder="Sheet Name"
                            />
                            <div className="flex items-center gap-2">
                                <select
                                    value={config.height} onChange={(e) => handleResolutionChange(parseInt(e.target.value))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                                >
                                    {RESOLUTIONS.map(r => <option key={r} value={r}>{r} x {r}</option>)}
                                </select>
                                <Tooltip text="Sets the canvas resolution in pixels (Square)." side="left" />
                            </div>
                        </div>
                    </div >

                    {/* Layout Strategy (Zones) */}
                    < div >
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                            <LayoutTemplate size={14} /> Sheet Layout
                            <Tooltip text="Choose a base topology for your Trim Sheet zones." side="right" />
                        </h2>
                        <div className="space-y-3 bg-slate-800/30 p-4 rounded border border-slate-800/50">
                            <p className="text-xs text-slate-500 mb-1">Select a base zone structure:</p>
                            <div className="grid grid-cols-2 gap-2">
                                <button onClick={() => generateLayout('single')} className={`flex flex-col items-center gap-1.5 p-3 rounded border text-xs hover:bg-slate-700 transition-all ${zones.length === 1 ? 'bg-blue-900/40 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <div className="w-8 h-8 border border-current rounded-sm"></div>
                                    Single
                                </button>
                                <button onClick={() => generateLayout('quad')} className={`flex flex-col items-center gap-1.5 p-3 rounded border text-xs hover:bg-slate-700 transition-all ${zones.length === 4 ? 'bg-blue-900/40 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <div className="w-8 h-8 border border-current rounded-sm grid grid-cols-2 grid-rows-2">
                                        <div className="border-r border-b border-current"></div>
                                        <div className="border-b border-current"></div>
                                        <div className="border-r border-current"></div>
                                        <div></div>
                                    </div>
                                    Quad (4x)
                                </button>
                                <button onClick={() => generateLayout('split_h')} className={`flex flex-col items-center gap-1.5 p-3 rounded border text-xs hover:bg-slate-700 transition-all ${zones.length === 2 && zones[0].height === 0.5 ? 'bg-blue-900/40 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <div className="w-8 h-8 border border-current rounded-sm grid grid-rows-2">
                                        <div className="border-b border-current"></div>
                                        <div></div>
                                    </div>
                                    Split Horiz
                                </button>
                                <button onClick={() => generateLayout('split_v')} className={`flex flex-col items-center gap-1.5 p-3 rounded border text-xs hover:bg-slate-700 transition-all ${zones.length === 2 && zones[0].width === 0.5 ? 'bg-blue-900/40 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <div className="w-8 h-8 border border-current rounded-sm grid grid-cols-2">
                                        <div className="border-r border-current"></div>
                                        <div></div>
                                    </div>
                                    Split Vert
                                </button>
                                <button onClick={() => generateLayout('six_pack')} className={`flex flex-col items-center gap-1.5 p-3 rounded border text-xs hover:bg-slate-700 transition-all ${zones.length === 6 ? 'bg-blue-900/40 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <div className="w-8 h-8 border border-current rounded-sm grid grid-cols-3 grid-rows-2">
                                        <div className="border-r border-b border-current"></div>
                                        <div className="border-r border-b border-current"></div>
                                        <div className="border-b border-current"></div>
                                        <div className="border-r border-current"></div>
                                        <div className="border-r border-current"></div>
                                        <div></div>
                                    </div>
                                    Six Pack (6x)
                                </button>
                                <button onClick={() => generateLayout('grid_9')} className={`flex flex-col items-center gap-1.5 p-3 rounded border text-xs hover:bg-slate-700 transition-all ${zones.length === 9 ? 'bg-blue-900/40 border-blue-500/50 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <div className="w-8 h-8 border border-current rounded-sm grid grid-cols-3 grid-rows-3">
                                        <div className="border-r border-b border-current"></div>
                                        <div className="border-r border-b border-current"></div>
                                        <div className="border-b border-current"></div>
                                        <div className="border-r border-b border-current"></div>
                                        <div className="border-r border-b border-current"></div>
                                        <div className="border-b border-current"></div>
                                        <div className="border-r border-current"></div>
                                        <div className="border-r border-current"></div>
                                        <div></div>
                                    </div>
                                    Grid 9 (9x)
                                </button>
                            </div>
                        </div>
                    </div >

                    {/* Visual Style */}
                    < div >
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                            <Eye size={14} /> Style
                            <Tooltip text="Change how the sheet is rendered for export or preview." side="right" />
                        </h2>
                        <div className="space-y-4 bg-slate-800/30 p-4 rounded border border-slate-800/50">
                            <select
                                value={config.renderStyle}
                                onChange={(e) => setConfig({ ...config, renderStyle: e.target.value as any })}
                                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="solid">Solid ID</option>
                                <option value="gradient">Gradient Depth</option>
                                <option value="outline">Wireframe</option>
                            </select>
                            {config.renderStyle !== 'outline' && (
                                <div className="flex items-center gap-3">
                                    <input type="color" value={config.stripGridColor} onChange={(e) => setConfig({ ...config, stripGridColor: e.target.value })} className="w-8 h-8 rounded cursor-pointer border border-slate-600" />
                                    <span className="text-xs text-slate-400 flex-1">Grid Color</span>
                                    <Tooltip text="Color of subdivision lines in Solid/Gradient modes." side="left" />
                                </div>
                            )}
                            {config.renderStyle === 'outline' && (
                                <>
                                    <div className="space-y-1.5 mt-3">
                                        <div className="flex justify-between text-xs text-slate-400">
                                            <span>Outline Thickness</span>
                                            <span>{config.outlineThickness}px</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="20" step="1"
                                            value={config.outlineThickness}
                                            onChange={(e) => setConfig({ ...config, outlineThickness: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
                                        />
                                    </div>
                                    <label className="flex items-center gap-3 cursor-pointer group mt-2">
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${config.outlineFillStyle === 'transparent' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-600 group-hover:border-slate-500'}`}>
                                            {config.outlineFillStyle === 'transparent' && <CheckSquare size={10} className="text-white" />}
                                        </div>
                                        <input
                                            type="checkbox" className="hidden"
                                            checked={config.outlineFillStyle === 'transparent'}
                                            onChange={(e) => setConfig({ ...config, outlineFillStyle: e.target.checked ? 'transparent' : 'solid' })}
                                        />
                                        <span className="text-xs text-slate-400 group-hover:text-slate-300">Transparent Background</span>
                                        <Tooltip text="Make background transparent for overlays in other tools." side="left" />
                                    </label>
                                </>
                            )}

                            {/* Post Processing Controls */}
                            <div className="pt-3 border-t border-slate-700/50 space-y-4">
                                {/* Saturation */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <Droplet size={12} /> Saturation
                                            <Tooltip text="Adjust global color intensity." side="right" />
                                        </span>
                                        <span>{Math.round(config.globalSaturation * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="2" step="0.1"
                                        value={config.globalSaturation}
                                        onChange={(e) => setConfig({ ...config, globalSaturation: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Brightness */}
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <Sun size={12} /> Brightness
                                            <Tooltip text="Adjust global lightness." side="right" />
                                        </span>
                                        <span>{Math.round(config.globalBrightness * 100)}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="2" step="0.1"
                                        value={config.globalBrightness}
                                        onChange={(e) => setConfig({ ...config, globalBrightness: parseFloat(e.target.value) })}
                                        className="w-full h-1.5 bg-slate-700 rounded appearance-none cursor-pointer accent-blue-500"
                                    />
                                </div>

                                {/* Export Checkbox */}
                                <label className="flex items-center gap-3 cursor-pointer group">
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${config.exportPostProcessing ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-600 group-hover:border-slate-500'}`}>
                                        {config.exportPostProcessing && <CheckSquare size={10} className="text-white" />}
                                    </div>
                                    <input
                                        type="checkbox" className="hidden"
                                        checked={config.exportPostProcessing}
                                        onChange={(e) => setConfig({ ...config, exportPostProcessing: e.target.checked })}
                                    />
                                    <span className="text-xs text-slate-400 group-hover:text-slate-300">Save Effects in Export</span>
                                    <Tooltip text="Apply Brightness/Saturation filters to the saved PNG." side="left" />
                                </label>
                            </div>
                        </div>
                    </div >

                    {/* HOW TO START BUTTON */}
                    < button
                        onClick={() => setShowHelpModal(true)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm font-bold text-blue-400 flex items-center justify-center gap-2.5 transition-all hover:border-blue-500/50"
                    >
                        <BookOpen size={16} /> How to Start ?
                    </button >

                    <div className="flex-1"></div>

                    {/* Export */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => fileInputRef.current?.click()} className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors">
                                <Upload size={16} /> Import JSON
                                <Tooltip text="Load project JSON file." side="top" />
                            </button>
                            <button onClick={handleExportJSON} className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors">
                                <FileJson size={16} /> Save JSON
                                <Tooltip text="Save project JSON file." side="top" />
                            </button>
                        </div>
                        <button onClick={handleExportPNG} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded shadow-lg border border-blue-500">
                            <Download size={16} /> Export PNG
                            <Tooltip text="Export current view as image." side="top" />
                        </button>
                    </div>
                </aside >

                {/* CENTER: Viewport */}
                < main
                    className="flex-1 bg-slate-950 relative overflow-hidden cursor-grab active:cursor-grabbing"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    ref={viewportRef}
                >
                    {/* Canvas Container with Transform */}
                    < div
                        className="absolute origin-center transition-transform duration-75 ease-out shadow-2xl"
                        style={{
                            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                            left: '50%', top: '50%',
                            marginLeft: -config.width / 2, marginTop: -config.height / 2
                        }}
                        onClick={handleCanvasClick}
                    >
                        <TrimCanvas
                            ref={canvasRef}
                            config={config}
                            zones={zones}
                            activeZoneIds={activeZoneIds}
                            showSelectionOverlay={showSelectionOverlay}
                        />
                    </div >

                    {/* Viewport Overlay Controls */}
                    < div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-full px-4 py-2 shadow-xl" >
                        <button onClick={() => setZoom(z => Math.max(0.2, z - 0.2))} className="p-1.5 hover:text-white text-slate-400"><ZoomOut size={18} /></button>
                        <span className="text-sm font-mono w-14 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-1.5 hover:text-white text-slate-400"><ZoomIn size={18} /></button>
                        <div className="w-px h-5 bg-slate-700 mx-1"></div>
                        <button
                            onClick={() => setShowSelectionOverlay(!showSelectionOverlay)}
                            className={`p-1.5 hover:text-white ${showSelectionOverlay ? 'text-blue-400' : 'text-slate-500'}`}
                            title="Toggle Selection Overlay"
                        >
                            <Scan size={18} />
                        </button>
                        <div className="w-px h-5 bg-slate-700 mx-1"></div>
                        <button onClick={() => { setZoom(0.5); setPan({ x: 0, y: 0 }); }} className="p-1.5 hover:text-white text-slate-400" title="Reset View"><RotateCcw size={18} /></button>
                    </div >

                    <div className="absolute top-4 left-4 text-xs text-slate-500 bg-black/50 px-3 py-1.5 rounded">
                        Scroll to Zoom • Drag to Pan • Toggle Zone Selection by Click
                    </div>
                </main >

                {/* RIGHT SIDEBAR: Editor Panel */}
                < aside className="w-[420px] flex flex-col border-l border-slate-800 bg-slate-900/50 backdrop-blur-sm z-10" >
                    {
                        activeZoneIds.length > 0 ? (
                            <>
                                {/* Header depends on Selection Count */}
                                <div className="p-5 border-b border-slate-800 bg-slate-900/80 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                                            {activeZoneIds.length > 1 ? (
                                                <>
                                                    <CheckSquare size={16} className="text-blue-500" />
                                                    {activeZoneIds.length} Zones Selected
                                                </>
                                            ) : (
                                                <>
                                                    <MousePointer2 size={16} className="text-blue-500" />
                                                    {primaryActiveZone?.name}
                                                </>
                                            )}
                                        </h2>
                                        {primaryActiveZone && (
                                            <span className="text-[10px] font-mono text-slate-500 border border-slate-700 px-2 py-0.5 rounded bg-slate-800">
                                                {Math.round(primaryActiveZone.width * 100)}% x {Math.round(primaryActiveZone.height * 100)}%
                                            </span>
                                        )}
                                    </div>

                                    {/* Macro Controls (Work for Single or Multi) */}
                                    <div className="flex bg-slate-900 border border-slate-800 rounded p-1.5 relative group">
                                        <div className="absolute top-0 right-0 p-1"><Tooltip text="Rotates the layout direction of strips within the zone." side="left" /></div>
                                        <button
                                            onClick={() => handleOrientationChange('horizontal')}
                                            className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 rounded transition-all ${(primaryActiveZone?.layoutMode === 'horizontal' && activeZoneIds.length === 1)
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                                }`}
                                        >
                                            <MoveVertical size={14} /> Rows
                                        </button>
                                        <button
                                            onClick={() => handleOrientationChange('vertical')}
                                            className={`flex-1 flex items-center justify-center gap-2 text-xs font-medium py-2 rounded transition-all ${(primaryActiveZone?.layoutMode === 'vertical' && activeZoneIds.length === 1)
                                                ? 'bg-blue-600 text-white shadow-sm'
                                                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                                }`}
                                        >
                                            <MoveHorizontal size={14} /> Cols
                                        </button>
                                    </div>

                                    {/* Generators & Templates */}
                                    <div className="space-y-3">
                                        {/* Zone Templates */}
                                        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex flex-col gap-2.5">
                                            <label className="text-xs uppercase text-slate-500 font-bold tracking-wider flex items-center gap-2">
                                                <LayoutList size={12} /> Apply Zone Template
                                                <Tooltip text="Presets for common trim sheet patterns (e.g. 4x Uniform)." side="left" />
                                            </label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedZoneTemplate}
                                                    onChange={(e) => setSelectedZoneTemplate(e.target.value as ZoneTemplateType)}
                                                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm outline-none"
                                                >
                                                    {ZONE_TEMPLATES.map(t => (
                                                        <option key={t.value} value={t.value}>{t.label}</option>
                                                    ))}
                                                </select>
                                                <button onClick={handleApplyZoneTemplate} className="px-4 bg-blue-900/40 border border-blue-800 text-blue-200 rounded hover:bg-blue-800/40 text-xs font-medium">
                                                    Apply
                                                </button>
                                            </div>
                                        </div>

                                        {/* Auto Fill / Randomizer */}
                                        <div className="bg-slate-900 border border-slate-800 rounded p-3 flex flex-col gap-2.5">
                                            <label className="text-xs uppercase text-slate-500 font-bold tracking-wider flex items-center justify-between">
                                                <span className="flex items-center gap-2">
                                                    <Shuffle size={12} /> Auto-Fill Generator
                                                    <Tooltip text="Randomly generate strips to fill the zone." side="right" />
                                                </span>
                                                <span className="text-slate-400 flex items-center gap-1 font-normal text-[10px]">Max: {maxRandomStrips} <Tooltip text="Max number of strips to generate." side="left" /></span>
                                            </label>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="range"
                                                    min="1" max="16"
                                                    value={maxRandomStrips}
                                                    onChange={(e) => setMaxRandomStrips(parseInt(e.target.value))}
                                                    className="flex-1 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                                />
                                                <button onClick={handleRandomize} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs text-slate-300 font-medium">
                                                    Generate
                                                </button>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="flex gap-2">
                                            <button onClick={handleUniqueColors} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-xs flex items-center justify-center gap-1.5 text-slate-300 font-medium">
                                                <Palette size={12} /> Colorize
                                                <Tooltip text="Assign random unique colors to all strips." side="top" />
                                            </button>
                                            {primaryActiveZone && validation.zoneResults[primaryActiveZone.id].remaining > 0 && (
                                                <button onClick={handleFillRemaining} className="flex-1 py-2 bg-amber-900/30 border border-amber-800 text-amber-300 rounded text-xs flex items-center justify-center gap-1.5 font-medium">
                                                    <Maximize size={12} /> Fill Rem
                                                    <Tooltip text="Add a placeholder strip to fill empty space." side="top" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Validation Info (Only for Single) */}
                                    {primaryActiveZone && activeZoneIds.length === 1 && (
                                        <div className={`text-xs px-3 py-1.5 rounded border flex justify-between items-center ${validation.zoneResults[primaryActiveZone.id].isValid ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' : 'bg-amber-900/20 border-amber-800 text-amber-400'}`}>
                                            <span className="font-medium">{validation.zoneResults[primaryActiveZone.id].isValid ? 'Perfect Fit' : 'Size Mismatch'}</span>
                                            <span className="flex items-center gap-1 font-mono">
                                                {validation.zoneResults[primaryActiveZone.id].currentSize} / {validation.zoneResults[primaryActiveZone.id].targetSize}px
                                                <Tooltip text="Ensure total strip size matches zone size." side="left" />
                                            </span>
                                        </div>
                                    )}
                                    {activeZoneIds.length > 1 && (
                                        <div className="text-xs px-3 py-2 rounded border bg-blue-900/20 border-blue-800 text-blue-300 flex items-center gap-2">
                                            <Info size={14} />
                                            <span>Edits synced across {activeZoneIds.length} zones.</span>
                                        </div>
                                    )}
                                </div>

                                {/* Strip List Content - UNLOCKED FOR MULTI-SELECTION */}
                                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                                    {primaryActiveZone ? (
                                        <div className="flex flex-col gap-3 pb-8">
                                            {primaryActiveZone.strips.map((strip, idx) => (
                                                <StripEditor
                                                    key={strip.id}
                                                    index={idx}
                                                    strip={strip}
                                                    totalStrips={primaryActiveZone.strips.length}
                                                    isVertical={primaryActiveZone.layoutMode === 'vertical'}
                                                    onChange={handleUpdateStrip}
                                                    onRemove={handleRemoveStrip}
                                                    onMove={handleMoveStrip}
                                                />
                                            ))}
                                            <button onClick={handleAddStrip} className="w-full py-5 mt-3 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-lg text-slate-600 hover:text-blue-400 hover:bg-slate-800/30 transition-all flex flex-col items-center justify-center gap-1.5 group">
                                                <Plus size={28} className="opacity-50 group-hover:opacity-100 group-hover:scale-110 transition-all" />
                                                <span className="text-sm font-bold">ADD STRIP TO {activeZoneIds.length > 1 ? 'ALL ZONES' : 'ZONE'}</span>
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-600 p-8 text-center">
                                <MousePointer2 size={64} className="mb-6 opacity-20" />
                                <p className="text-base font-medium text-slate-400">Select a Zone</p>
                                <p className="text-sm mt-2 text-slate-500">Click on any zone in the viewport to edit its contents.</p>
                            </div>
                        )
                    }
                </aside >

            </div >
        </div >
    );
};

export default App;