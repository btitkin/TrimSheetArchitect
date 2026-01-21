import React from 'react';
import { TrimStrip, FillType } from '../types';
import { FILL_TYPES, generateRandomFullRangeColor } from '../constants';
import { Trash2, ArrowUp, ArrowDown, Grid3X3, Palette, Shuffle, Hash, Columns, Rows } from 'lucide-react';

interface StripEditorProps {
  strip: TrimStrip;
  index: number;
  totalStrips: number;
  isVertical: boolean; // New prop
  onChange: (id: string, updates: Partial<TrimStrip>) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, direction: -1 | 1) => void;
}

const StripEditor: React.FC<StripEditorProps> = ({ strip, index, totalStrips, isVertical, onChange, onRemove, onMove }) => {
  
  const handleSubdivisionChange = (count: number) => {
    // Resize the color array while preserving existing colors where possible
    const newColors = Array(count).fill(strip.baseColor);
    if (strip.subdivisionColors) {
        strip.subdivisionColors.forEach((c, i) => {
            if (i < count) newColors[i] = c;
        });
    }
    onChange(strip.id, { subdivisions: count, subdivisionColors: newColors });
  };

  const handleColorChange = (segmentIndex: number, color: string) => {
      const newColors = [...(strip.subdivisionColors || Array(strip.subdivisions).fill(strip.baseColor))];
      newColors[segmentIndex] = color;
      onChange(strip.id, { subdivisionColors: newColors });
  };

  const handleRandomizeColors = () => {
      const newColors = Array(strip.subdivisions).fill('').map(() => 
          generateRandomFullRangeColor()
      );
      onChange(strip.id, { subdivisionColors: newColors });
  };

  return (
    <div className="bg-slate-800 border border-slate-700 p-4 rounded-md mb-2 flex flex-col gap-4 hover:border-slate-500 transition-colors group">
      {/* Header Line */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          {/* Color Control: Swatch + Hex Input */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded p-1 relative group/item">
              <div 
                className="w-7 h-7 rounded-sm shrink-0 border border-slate-600 shadow-sm relative group/color cursor-pointer"
                style={{ backgroundColor: strip.baseColor }}
              >
                 <input 
                    type="color" 
                    value={strip.baseColor}
                    onChange={(e) => onChange(strip.id, { baseColor: e.target.value })}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    title="Pick Color"
                 />
              </div>
              <input 
                 type="text" 
                 value={strip.baseColor}
                 onChange={(e) => {
                     onChange(strip.id, { baseColor: e.target.value })
                 }}
                 className="w-16 bg-transparent text-xs font-mono text-slate-300 px-2 outline-none uppercase"
                 title="Hex Color"
              />
          </div>

          <input
            type="text"
            value={strip.name}
            onChange={(e) => onChange(strip.id, { name: e.target.value })}
            className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-sm w-full font-mono focus:border-blue-500 outline-none"
            placeholder="Strip Name"
          />
        </div>
        
        <div className="flex items-center gap-1">
            <button 
                onClick={() => onMove(index, -1)} 
                disabled={index === 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700 rounded transition-colors"
                title="Move Up"
            >
                <ArrowUp size={18} />
            </button>
            <button 
                onClick={() => onMove(index, 1)} 
                disabled={index === totalStrips - 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-700 rounded transition-colors"
                title="Move Down"
            >
                <ArrowDown size={18} />
            </button>
            <button
                onClick={() => onRemove(strip.id)}
                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded ml-1 transition-colors"
                title="Remove Strip"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Details Line */}
      <div className="grid grid-cols-12 gap-3">
        {/* Height/Width Control */}
        <div className="col-span-4 flex flex-col gap-1.5">
            <label className="text-xs uppercase text-slate-500 font-bold tracking-wider flex items-center">
                {isVertical ? 'Width' : 'Height'}
            </label>
            <div className="relative">
                <input
                type="number"
                value={strip.height}
                onChange={(e) => onChange(strip.id, { height: Math.max(1, parseInt(e.target.value) || 0) })}
                step={32}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-sm w-full font-mono focus:border-blue-500 outline-none"
                />
                 {/* Power of 2 Quick Helpers */}
                 <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {[64, 128, 256].map(h => (
                        <button 
                            key={h}
                            onClick={() => onChange(strip.id, { height: h })}
                            className="text-[10px] bg-slate-700 hover:bg-blue-600 px-1.5 py-0.5 rounded text-slate-300 hover:text-white"
                        >
                            {h}
                        </button>
                    ))}
                 </div>
            </div>
        </div>

        {/* Subdivision Control */}
        <div className="col-span-4 flex flex-col gap-1.5">
            <label className="text-xs uppercase text-slate-500 font-bold tracking-wider flex items-center gap-1.5">
                {isVertical ? <Rows size={12} /> : <Columns size={12} />} 
                {isVertical ? ' Y-Split' : ' X-Split'}
            </label>
            <select
                value={strip.subdivisions}
                onChange={(e) => handleSubdivisionChange(parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-sm w-full focus:border-blue-500 outline-none appearance-none"
                title={isVertical ? "Vertical Repeat (Rows)" : "Horizontal Repeat (Columns)"}
            >
                <option value={1}>None (1x)</option>
                <option value={2}>Half (2x)</option>
                <option value={3}>Thirds (3x)</option>
                <option value={4}>Quarters (4x)</option>
                <option value={8}>Eighths (8x)</option>
                <option value={16}>Sixteenths (16x)</option>
            </select>
        </div>

        {/* Fill Type Control */}
        <div className="col-span-4 flex flex-col gap-1.5">
            <label className="text-xs uppercase text-slate-500 font-bold tracking-wider flex items-center">
                Fill
            </label>
            <select
                value={strip.fillType}
                onChange={(e) => onChange(strip.id, { fillType: e.target.value as FillType })}
                className="bg-slate-900 border border-slate-700 text-slate-200 px-3 py-1.5 rounded text-sm w-full focus:border-blue-500 outline-none appearance-none"
            >
                {FILL_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
                ))}
            </select>
        </div>
      </div>

      {/* Segment Color Editor (Visible if split > 1) */}
      {strip.subdivisions > 1 && (
          <div className="border-t border-slate-700 pt-3 mt-1">
              <div className="flex items-center justify-between mb-3">
                   <label className="text-xs uppercase text-slate-500 font-bold tracking-wider flex items-center gap-2">
                       <Palette size={12} /> Segment Colors
                   </label>
                   <button 
                        onClick={handleRandomizeColors}
                        className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-blue-400 transition-colors"
                   >
                       <Shuffle size={12} /> Mix (Random)
                   </button>
              </div>
              
              <div className="flex flex-wrap gap-1.5">
                  {(strip.subdivisionColors || Array(strip.subdivisions).fill(strip.baseColor)).map((col, idx) => (
                      <div 
                        key={idx} 
                        className="w-8 h-8 rounded border border-slate-600 relative overflow-hidden group/item cursor-pointer hover:border-white transition-colors"
                        style={{ backgroundColor: col }}
                        title={`Segment ${idx + 1}`}
                      >
                          <input 
                            type="color" 
                            value={col} 
                            onChange={(e) => handleColorChange(idx, e.target.value)}
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                          />
                      </div>
                  ))}
              </div>
          </div>
      )}

    </div>
  );
};

export default StripEditor;