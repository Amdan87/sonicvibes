import React from 'react';
import { useAppStore } from '../stores/useAppStore';

export function FullIntelModal({ onClose }) {
    const { analysisResult } = useAppStore();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 lg:p-10 backdrop-blur-sm">
            <div className="w-full h-full max-w-6xl bg-black border-2 border-industrial-orange flex flex-col relative shadow-[0_0_50px_rgba(249,115,22,0.2)] animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header */}
                <div className="flex justify-between items-center p-4 border-b-2 border-industrial-orange bg-industrial-orange/10">
                    <div className="flex items-center gap-4">
                        <span className="material-symbols-outlined text-industrial-orange text-3xl animate-pulse">terminal</span>
                        <div>
                            <h3 className="text-2xl font-heading text-white tracking-widest leading-none">FULL_INTEL_ANALYSIS</h3>
                            <p className="text-[10px] text-industrial-orange font-mono">RAW_DATA_STREAM // CLASSIFIED_LEVEL_5</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-industrial-orange hover:text-white transition-colors border border-industrial-orange/50 hover:bg-industrial-orange/20 p-1"
                    >
                        <span className="material-symbols-outlined text-4xl">close</span>
                    </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-auto p-8 font-mono text-sm bg-black/50 custom-scrollbar relative">
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
                    <pre className="whitespace-pre-wrap leading-relaxed text-green-400 font-bold" style={{ textShadow: '0 0 5px rgba(74, 222, 128, 0.5)' }}>
                        {analysisResult?.rawResponse || '> ERROR: NO RAW DATA STREAM AVAILABLE from CORE CPU.'}
                    </pre>
                </div>

                {/* Modal Footer */}
                <div className="p-2 border-t border-industrial-orange/30 bg-black text-[10px] text-industrial-orange flex justify-between font-mono uppercase">
                    <span>SECURE_CONNECTION: ESTABLISHED [v.9.0.2]</span>
                    <span>ENCRYPTION: AES-256-GCM</span>
                </div>
            </div>
        </div>
    );
}
