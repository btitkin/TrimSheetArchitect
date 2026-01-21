import { TrimStrip, SheetConfig, Preset, TrimZone } from './types';

export const RESOLUTIONS = [1024, 2048, 4096];

export const FILL_TYPES: { value: string; label: string }[] = [
  { value: 'flat', label: 'Solid Color (ID Map)' },
  { value: 'checker', label: 'Checker Pattern' },
  { value: 'noise', label: 'Noise Overlay' },
  { value: 'gradient_v', label: 'Gradient Overlay' },
];

export const TEXEL_DENSITY_OPTIONS = [
  { value: 128, label: '128 PX/M (1.28 PX/CM) - STRATEGIC CAMERA' },
  { value: 256, label: '256 PX/M (2.56 PX/CM) - STRATEGIC CAMERA' },
  { value: 512, label: '512 PX/M (5.12 PX/CM) - THIRD PERSON CAMERA' },
  { value: 1024, label: '1024 PX/M (10.24 PX/CM) - FIRST PERSON CAMERA' },
  { value: 2048, label: '2048 PX/M (20.48 PX/CM) - FINAL RENDER' },
  { value: 4096, label: '4096 PX/M (40.96 PX/CM) - HERO SHOTS' },
];

export const COLORS = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF', 
  '#FFFFFF', '#808080', '#FFA500', '#800080', '#008080', '#FFC0CB'
];

const getColor = (index: number) => COLORS[index % COLORS.length];

const hslToHex = (h: number, s: number, l: number) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const generateUniqueColor = (index: number) => {
    const goldenAngle = 137.508;
    const hue = (index * goldenAngle) % 360;
    const sat = 65 + (index % 5) * 5; 
    const lig = 45 + (index % 3) * 10;
    return hslToHex(hue, sat, lig);
};

export const generateRandomFullRangeColor = () => {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 50) + 50; 
    const l = Math.floor(Math.random() * 50) + 30;
    return hslToHex(h, s, l);
};

export const generateDistributedColors = (count: number) => {
    const colors = [];
    const step = 360 / count;
    for (let i = 0; i < count; i++) {
        const hue = (i * step) % 360;
        const sat = 70 + (i % 2) * 20;
        const lig = 45 + (i % 3) * 10;
        colors.push(hslToHex(hue, sat, lig));
    }
    return colors;
};

// Helper to make a strip
const createStrip = (partial: Partial<TrimStrip>, index: number): TrimStrip => {
  const baseColor = partial.baseColor || getColor(index);
  const subs = partial.subdivisions || 1;
  return {
    id: partial.id || `strip_${index}_${Math.random().toString(36).substr(2,5)}`,
    name: partial.name || `Strip ${index}`,
    height: partial.height || 128,
    fillType: partial.fillType || 'flat',
    baseColor: baseColor,
    subdivisions: subs,
    subdivisionColors: Array(subs).fill(baseColor)
  };
};

// Zone Template Types
export type ZoneTemplateType = 'classic' | 'uniform_4' | 'uniform_8' | 'single' | 'detail_stack';

export const ZONE_TEMPLATES: { value: ZoneTemplateType; label: string }[] = [
    { value: 'classic', label: 'Classic (Trim/Main/Trim)' },
    { value: 'uniform_4', label: 'Uniform 4x' },
    { value: 'uniform_8', label: 'Uniform 8x' },
    { value: 'single', label: 'Single Fill' },
    { value: 'detail_stack', label: 'Detail Stack' },
];

export const generateZoneTemplateStrips = (type: ZoneTemplateType, totalSize: number, seed: number): TrimStrip[] => {
    const strips: TrimStrip[] = [];
    
    switch (type) {
        case 'classic': {
            // 20% Trim, 60% Main, 20% Trim
            const trimH = Math.floor(totalSize * 0.2);
            const mainH = totalSize - (trimH * 2);
            strips.push(createStrip({ name: "Top_Trim", height: trimH, baseColor: getColor(seed) }, 0));
            strips.push(createStrip({ name: "Main_Fill", height: mainH, baseColor: getColor(seed+1) }, 1));
            strips.push(createStrip({ name: "Bot_Trim", height: trimH, baseColor: getColor(seed+2) }, 2));
            break;
        }
        case 'uniform_4': {
            const h = Math.floor(totalSize / 4);
            const rem = totalSize - (h * 4);
            for(let i=0; i<4; i++) {
                strips.push(createStrip({ name: `Uniform_${i+1}`, height: i===3 ? h+rem : h, baseColor: getColor(seed+i) }, i));
            }
            break;
        }
        case 'uniform_8': {
            const h = Math.floor(totalSize / 8);
            const rem = totalSize - (h * 8);
            for(let i=0; i<8; i++) {
                strips.push(createStrip({ name: `Uniform_${i+1}`, height: i===7 ? h+rem : h, baseColor: getColor(seed+i) }, i));
            }
            break;
        }
        case 'single': {
            strips.push(createStrip({ name: "Full_Coverage", height: totalSize, baseColor: getColor(seed) }, 0));
            break;
        }
        case 'detail_stack': {
             // Many small strips
             let current = 0;
             let idx = 0;
             while(current < totalSize) {
                 const h = Math.min(totalSize - current, idx % 2 === 0 ? 128 : 64);
                 if (h <= 0) break;
                 strips.push(createStrip({ name: `Detail_${idx+1}`, height: h, baseColor: getColor(seed+idx), subdivisions: idx % 3 === 0 ? 4 : 1 }, idx));
                 current += h;
                 idx++;
             }
             break;
        }
        default: 
            return generateDefaultZoneStrips(totalSize, seed);
    }
    return strips;
};


// Generates basic template content for a zone so it isn't empty
export const generateDefaultZoneStrips = (zoneHeightPx: number, seedOffset: number): TrimStrip[] => {
    // A simple template: Top Trim, Main Fill, Bottom Detail
    const colorStart = seedOffset * 3;
    
    const mainHeight = Math.floor(zoneHeightPx * 0.5);
    const trimHeight = Math.floor(zoneHeightPx * 0.25);
    const detailHeight = zoneHeightPx - mainHeight - trimHeight;

    return [
        createStrip({ name: "Top_Trim", height: trimHeight, baseColor: getColor(colorStart) }, 0),
        createStrip({ name: "Main_Fill", height: mainHeight, baseColor: getColor(colorStart + 1) }, 1),
        createStrip({ name: "Detail_Bottom", height: detailHeight, baseColor: getColor(colorStart + 2), subdivisions: 4 }, 2),
    ];
};

const DEFAULT_BG_CONFIG = {
    renderStyle: 'solid' as const,
    outlineThickness: 4,
    outlineFillStyle: 'solid' as const,
    showTexelDensity: false,
    texelDensityTarget: 512,
    stripGridColor: '#000000',
    globalSaturation: 1.0,
    globalBrightness: 1.0,
    exportPostProcessing: true,
};

// --- DATA MIGRATION HELPERS ---
const wrapInZone = (strips: TrimStrip[]): TrimZone[] => ([{
    id: 'main_zone',
    name: 'Main Layout',
    x: 0, y: 0, width: 1, height: 1,
    layoutMode: 'horizontal',
    strips: strips
}]);

// PRESET DATA (Wrapped)
const UNIFORM_256 = wrapInZone(Array.from({ length: 8 }).map((_, i) => createStrip({
  id: `u256_${i}`,
  name: `Strip_${i + 1}_256px`,
  height: 256
}, i)));

const MIXED_STANDARD = wrapInZone([
  createStrip({ id: 'm1', name: "Main_Surface_Tiling", height: 512, baseColor: getColor(0) }, 0),
  createStrip({ id: 'm2', name: "Secondary_Surface", height: 256, baseColor: getColor(1) }, 1),
  createStrip({ id: 'm3', name: "Large_Trim_A", height: 256, baseColor: getColor(2) }, 2),
  createStrip({ id: 'm4', name: "Large_Trim_B", height: 256, baseColor: getColor(3) }, 3),
  createStrip({ id: 'm5', name: "Medium_Trim_A", height: 128, baseColor: getColor(4) }, 4),
  createStrip({ id: 'm6', name: "Medium_Trim_B", height: 128, baseColor: getColor(5) }, 5),
  createStrip({ id: 'm7', name: "Pattern_Grate_C", height: 128, baseColor: getColor(6), subdivisions: 4 }, 6),
  createStrip({ id: 'm8', name: "Detail_Strip_A", height: 128, baseColor: getColor(7) }, 7),
  createStrip({ id: 'm9', name: "Micro_Trim_A", height: 64, baseColor: getColor(8) }, 8),
  createStrip({ id: 'm10', name: "Micro_Trim_B", height: 64, baseColor: getColor(9) }, 9),
  createStrip({ id: 'm11', name: "Border_Cap_A", height: 64, baseColor: getColor(10) }, 10),
  createStrip({ id: 'm12', name: "Border_Cap_B", height: 64, baseColor: getColor(11) }, 11)
]);

const SCIFI_COMPLEX = wrapInZone([
  createStrip({ id: 'sf1', name: "Hazard_Trim_Top", height: 64, baseColor: getColor(0), subdivisions: 16 }, 0),
  createStrip({ id: 'sf2', name: "Cabling_Bundle", height: 128, baseColor: getColor(1) }, 1),
  createStrip({ id: 'sf3', name: "Small_Vents", height: 128, baseColor: getColor(2), subdivisions: 8 }, 2),
  createStrip({ id: 'sf4', name: "Tech_Panel_Main", height: 512, baseColor: getColor(3), subdivisions: 2 }, 3),
  createStrip({ id: 'sf5', name: "Large_Intake_Fan", height: 512, baseColor: getColor(4) }, 4),
  createStrip({ id: 'sf6', name: "Greeble_Mechanism", height: 256, baseColor: getColor(5), subdivisions: 4 }, 5),
  createStrip({ id: 'sf7', name: "Pipes_Insulated", height: 256, baseColor: getColor(6) }, 6),
  createStrip({ id: 'sf8', name: "Floor_Grating", height: 128, baseColor: getColor(7) }, 7),
  createStrip({ id: 'sf9', name: "Warning_Stripe_Bot", height: 64, baseColor: getColor(8), subdivisions: 16 }, 8)
]);

const STONE_HIERARCHY = wrapInZone([
  createStrip({ id: 'st1', name: "Large_Slabs_A", height: 256, baseColor: getColor(0) }, 0),
  createStrip({ id: 'st2', name: "Large_Slabs_B", height: 256, baseColor: getColor(1) }, 1),
  createStrip({ id: 'st3', name: "Medium_Bricks_A", height: 128, baseColor: getColor(2) }, 2),
  createStrip({ id: 'st4', name: "Medium_Bricks_B", height: 128, baseColor: getColor(3) }, 3),
  createStrip({ id: 'st5', name: "Rough_Courses_Mixed", height: 256, baseColor: getColor(4) }, 4),
  createStrip({ id: 'st6', name: "Small_Tiles_A", height: 128, baseColor: getColor(5), subdivisions: 8 }, 5),
  createStrip({ id: 'st7', name: "Small_Tiles_B", height: 128, baseColor: getColor(6), subdivisions: 8 }, 6),
  createStrip({ id: 'st8', name: "Ornate_Trim_High", height: 256, baseColor: getColor(7) }, 7),
  createStrip({ id: 'st9', name: "Base_Molding", height: 256, baseColor: getColor(8) }, 8),
  createStrip({ id: 'st10', name: "Decal_Runes", height: 256, baseColor: getColor(9), subdivisions: 4 }, 9)
]);

const ULTIMATE_TRIM_STACK = wrapInZone([
  createStrip({ id: 'ut1', name: "LARGE_COVERAGE_AREA", height: 1024, baseColor: '#60a5fa' }, 0), 
  createStrip({ id: 'ut2', name: "MEDIUM_DETAIL_A", height: 256, baseColor: '#e879f9' }, 1), 
  createStrip({ id: 'ut3', name: "MEDIUM_DETAIL_B", height: 256, baseColor: '#d946ef', subdivisions: 2 }, 2),
  createStrip({ id: 'ut4', name: "SMALL_TRIM_A", height: 128, baseColor: '#fdba74' }, 3), 
  createStrip({ id: 'ut5', name: "SMALL_TRIM_B", height: 128, baseColor: '#fb923c' }, 4), 
  createStrip({ id: 'ut6', name: "END_CAPS_ROW", height: 128, baseColor: '#86efac', subdivisions: 8 }, 5),
  createStrip({ id: 'ut7', name: "DECALS_ROW", height: 128, baseColor: '#4ade80', subdivisions: 8 }, 6)
]);

export const PRESETS: Preset[] = [
  {
    id: 'uniform_256',
    label: 'Uniform 8x 256px',
    config: { width: 2048, height: 2048, name: "T_Uniform_Layout", ...DEFAULT_BG_CONFIG },
    zones: UNIFORM_256
  },
  {
    id: 'mixed_standard',
    label: 'Mixed Production (Standard)',
    config: { width: 2048, height: 2048, name: "T_Mixed_Layout", ...DEFAULT_BG_CONFIG },
    zones: MIXED_STANDARD
  },
  {
    id: 'scifi_complex',
    label: 'Sci-Fi Complex Panel',
    config: { width: 2048, height: 2048, name: "T_SciFi_Panel", ...DEFAULT_BG_CONFIG },
    zones: SCIFI_COMPLEX
  },
  {
    id: 'stone_hierarchy',
    label: 'Ancient Stone Wall',
    config: { width: 2048, height: 2048, name: "T_Stone_Wall", ...DEFAULT_BG_CONFIG },
    zones: STONE_HIERARCHY
  },
  {
    id: 'ultimate_stack',
    label: 'Ultimate Trim Stack (Zones)',
    config: { width: 2048, height: 2048, name: "T_Ultimate_Layout", ...DEFAULT_BG_CONFIG },
    zones: ULTIMATE_TRIM_STACK
  }
];

export const DEFAULT_CONFIG = PRESETS[1].config;
export const DEFAULT_ZONES = PRESETS[1].zones;
