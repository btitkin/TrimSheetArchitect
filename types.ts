
export type FillType = 'flat' | 'noise' | 'gradient_v' | 'checker';

export interface TrimStrip {
  id: string;
  name: string;
  height: number; // Represents the size along the main axis of the Zone
  fillType: FillType;
  baseColor: string;
  subdivisions: number;
  subdivisionColors: string[];
}

export type GlobalRenderStyle = 'solid' | 'gradient' | 'outline';
export type LayoutPresetType = 'single' | 'quad' | 'split_v' | 'split_h' | 'six_pack' | 'grid_9';

export interface TrimZone {
  id: string;
  name: string;
  x: number; // Normalized 0-1 position
  y: number; // Normalized 0-1 position
  width: number; // Normalized 0-1 width
  height: number; // Normalized 0-1 height
  layoutMode: 'horizontal' | 'vertical'; // Orientation specific to this zone
  strips: TrimStrip[];
}

export interface SheetConfig {
  width: number;
  height: number;
  name: string;
  renderStyle: GlobalRenderStyle;
  // layoutMode is now deprecated in global config, moved to Zone
  outlineThickness: number;
  outlineFillStyle: 'solid' | 'transparent';
  showTexelDensity: boolean;
  texelDensityTarget: number;
  stripGridColor: string;
  
  // Post Processing
  globalSaturation: number; // 0.0 to 2.0 (default 1.0)
  globalBrightness: number; // 0.0 to 2.0 (default 1.0)
  exportPostProcessing: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  zoneResults: Record<string, {
      currentSize: number;
      targetSize: number;
      remaining: number;
      isValid: boolean;
  }>;
}

export interface Preset {
  id: string;
  label: string;
  config: SheetConfig;
  zones: TrimZone[]; // Updated from strips[] to zones[]
}
