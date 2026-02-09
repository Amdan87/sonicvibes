import React, { useState, useEffect } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { FullIntelModal } from './FullIntelModal';

export function AiCorePanel() {
    const { analysisResult, isAnalyzing, focusMode, setFocusMode } = useAppStore();
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showFullIntel, setShowFullIntel] = useState(false);

    const defaultMessage = `> AWAITING DATA INPUT...
> UPLOAD CSV FILE TO BEGIN ANALYSIS.
> SYSTEM READY FOR LEVEL FUNNEL OPTIMIZATION.`;

    // Build full analysis text including recommendations
    const buildAnalysisText = () => {
        if (!analysisResult) return defaultMessage;

        let text = '';

        // Executive Summary
        if (analysisResult.executiveSummary) {
            text += `> EXECUTIVE SUMMARY:\n${analysisResult.executiveSummary}\n\n`;
        }

        // Segmentation
        if (analysisResult.segmentation) {
            text += `> SEGMENTATION ANALYSIS:\n${analysisResult.segmentation}\n\n`;
        }

        // Recommendations / Action Items
        if (analysisResult.recommendations && analysisResult.recommendations.length > 0) {
            text += `> ACTION ITEMS:\n`;
            analysisResult.recommendations.forEach((rec, i) => {
                text += `${i + 1}. ${rec}\n`;
            });
        }

        // If we have raw response but nothing parsed, show raw
        if (!text && analysisResult.rawResponse) {
            text = analysisResult.rawResponse;
        }

        return text || defaultMessage;
    };

    const analysisText = buildAnalysisText();

    // Typewriter effect - faster for longer text
    useEffect(() => {
        if (!analysisText) return;

        setIsTyping(true);
        setDisplayedText('');
        let index = 0;

        // Faster typing for longer text
        const speed = analysisText.length > 500 ? 5 : 15;

        const timer = setInterval(() => {
            if (index < analysisText.length) {
                setDisplayedText(analysisText.substring(0, index + 1));
                index++;
            } else {
                setIsTyping(false);
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [analysisText]);

    const focusModes = [
        { id: 'revenue', label: 'Revenue_Focused' },
        { id: 'retention', label: 'Retention_Focused' },
        { id: 'balanced', label: 'Balanced_Recommendations' }
    ];

    return (
        <section className="bg-black border-2 border-industrial-orange p-1 relative">
            {showFullIntel && <FullIntelModal onClose={() => setShowFullIntel(false)} />}

            <div className="bg-cyber-panel p-8 flex flex-col lg:flex-row items-start gap-10 border border-industrial-orange/20">
                <div className="shrink-0">
                    <div className="border-2 border-industrial-orange p-8 bg-black relative">
                        <span className={`material-symbols-outlined text-9xl text-industrial-orange ${isAnalyzing ? 'animate-pulse' : ''}`}>
                            memory
                        </span>
                        <div className="absolute -top-3 -left-3 bg-industrial-orange text-black px-2 py-1 text-xs font-bold">
                            {isAnalyzing ? 'PROCESSING' : 'CORE_CPU'}
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-4">
                            {analysisResult && (
                                <span className="bg-red-700 text-white px-3 py-1 font-bold text-xs">CRITICAL_ALERT</span>
                            )}
                            <h3 className="text-5xl font-heading text-industrial-orange tracking-tighter">
                                AI CORE EXTRACTION
                            </h3>
                        </div>

                        {/* Focus Mode Tabs */}
                        <div className="flex gap-8 mt-4 border-b border-white/5 font-mono text-sm">
                            {focusModes.map(mode => (
                                <button
                                    key={mode.id}
                                    onClick={() => setFocusMode(mode.id)}
                                    className={`pb-2 uppercase tracking-wider transition-colors ${focusMode === mode.id
                                        ? 'text-industrial-orange border-b-2 border-industrial-orange flex items-center gap-1'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {focusMode === mode.id && '> '}{mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Analysis Display - Reduced text size by 50% (from text-4xl to text-lg) */}
                    <div className="space-y-4 border-l-4 border-industrial-orange/50 pl-6 max-h-96 overflow-y-auto custom-scrollbar">
                        <div className="py-4 px-3">
                            <pre className="text-white text-lg font-heading leading-relaxed pixel-text whitespace-pre-wrap" style={{ fontSize: '18px', lineHeight: '1.6' }}>
                                {displayedText}
                                {isTyping && <span className="inline-block w-2 h-5 bg-industrial-orange ml-1 animate-pulse"></span>}
                            </pre>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-4 shrink-0 w-full lg:w-72">
                    <button
                        disabled={!analysisResult}
                        className="bg-industrial-orange text-black py-5 px-6 font-heading text-3xl font-black transition-all border-b-4 border-r-4 border-black/40 hover:bg-industrial-yellow active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isAnalyzing ? 'ANALYZING...' : 'EXECUTE_FIX'}
                    </button>
                    <button
                        disabled={!analysisResult}
                        onClick={() => setShowFullIntel(true)}
                        className="border-2 border-white text-white py-4 px-6 font-heading text-xl transition-all hover:bg-white hover:text-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        VIEW_FULL_INTEL
                    </button>
                </div>
            </div>
        </section>
    );
}
