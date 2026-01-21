import React, { useState } from 'react';
import { X, HelpCircle, BookOpen, MousePointer2, Layers, Download } from 'lucide-react';

// --- TOOLTIP COMPONENT ---

interface TooltipProps {
  text: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, side = 'top' }) => {
  return (
    <div className="group relative inline-flex items-center justify-center ml-1 cursor-help z-50">
      <HelpCircle size={12} className="text-slate-500 hover:text-blue-400 transition-colors" />
      <div 
        className={`
            absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 
            bg-slate-800 text-slate-200 text-[10px] p-2 rounded border border-slate-600 shadow-xl 
            pointer-events-none w-48 z-[100] font-normal tracking-normal leading-tight
            ${side === 'top' ? 'bottom-full mb-2' : ''}
            ${side === 'bottom' ? 'top-full mt-2' : ''}
            ${side === 'left' ? 'right-full mr-2' : ''}
            ${side === 'right' ? 'left-full ml-2' : ''}
        `}
      >
        {text}
        {/* Arrow */}
        <div 
            className={`absolute w-2 h-2 bg-slate-800 border-slate-600 transform rotate-45
            ${side === 'top' ? 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b' : ''}
            ${side === 'bottom' ? 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t' : ''}
            ${side === 'left' ? 'right-[-5px] top-1/2 -translate-y-1/2 border-r border-t' : ''}
            ${side === 'right' ? 'left-[-5px] top-1/2 -translate-y-1/2 border-l border-b' : ''}
            `}
        ></div>
      </div>
    </div>
  );
};

// --- MODAL COMPONENT ---

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col relative">
        
        {/* Close Button */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded transition-colors"
        >
            <X size={24} />
        </button>

        {/* Header */}
        <div className="p-8 border-b border-slate-800 bg-slate-950">
            <h2 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                <BookOpen className="text-blue-500" />
                Trim Sheet Architect <span className="text-slate-500 text-lg font-normal">- User Guide</span>
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
                A specialized tool for creating orthographic texture layouts for game environment pipelines.
            </p>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 text-slate-300 text-sm leading-relaxed">
            
            {/* Section 1: Introduction */}
            <section>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    What is this app?
                </h3>
                <p>
                    <strong>Trim Sheet Architect</strong> allows Technical Artists and Environment Artists to plan 
                    texture layouts before opening complex 3D software. It generates precise ID maps, 
                    gradient height maps, and wireframe guides that serve as a foundation for texturing 
                    in tools like Substance Designer or Painter.
                </p>
            </section>

            {/* Section 2: Workflow */}
            <section>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <Layers size={18} className="text-blue-400"/> Typical Workflow
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded border border-slate-800">
                        <strong className="text-blue-300 block mb-1">1. Setup Project</strong>
                        Set your target resolution (e.g., 2048x2048) and choose a base layout topology (Single, Quad, Split, etc.) from the left sidebar.
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded border border-slate-800">
                        <strong className="text-blue-300 block mb-1">2. Select & Edit Zones</strong>
                        Click on a zone in the central viewport to select it. The right sidebar will activate, allowing you to add, remove, or modify strips within that zone.
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded border border-slate-800">
                        <strong className="text-blue-300 block mb-1">3. Refine Strips</strong>
                        Adjust strip height, subdivisions (repeats), and colors. Use the "Auto-Fill" generator to quickly populate empty space with random patterns.
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded border border-slate-800">
                        <strong className="text-blue-300 block mb-1">4. Visualize & Export</strong>
                        Switch "Render Style" to <em>Gradient</em> for height maps or <em>Solid</em> for ID maps. Finally, export the PNG to use in your texturing software.
                    </div>
                </div>
            </section>

            {/* Section 3: Controls */}
            <section>
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <MousePointer2 size={18} className="text-blue-400"/> Controls & Interaction
                </h3>
                <ul className="list-disc list-inside space-y-2 text-slate-400">
                    <li><strong className="text-slate-200">Left Click (on Zone):</strong> Selects a zone for editing. Hold Ctrl/Cmd to select multiple zones.</li>
                    <li><strong className="text-slate-200">Left Drag / Middle Mouse:</strong> Pan the viewport camera.</li>
                    <li><strong className="text-slate-200">Scroll Wheel:</strong> Zoom in/out.</li>
                    <li><strong className="text-slate-200">Export PNG:</strong> Saves the current view (with filters) as an image file.</li>
                    <li><strong className="text-slate-200">Export JSON:</strong> Saves the project configuration to resume work later.</li>
                </ul>
            </section>

             {/* Section 4: Tips */}
             <section className="bg-blue-900/20 border border-blue-800/50 p-4 rounded">
                <h3 className="text-blue-200 font-bold mb-2 text-xs uppercase tracking-wider">Pro Tips</h3>
                <ul className="space-y-1 text-xs text-blue-100/80">
                    <li>• Use the <strong>Wireframe</strong> style with "Transparent Background" to overlay guides on top of existing textures.</li>
                    <li>• The <strong>Texel Density</strong> overlay helps ensure your strip heights match your game's density requirements (e.g. 512px/m).</li>
                    <li>• You can modify multiple zones at once by selecting them together in the viewport.</li>
                </ul>
            </section>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-950 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded transition-colors"
            >
                Get Started
            </button>
        </div>

      </div>
    </div>
  );
};
