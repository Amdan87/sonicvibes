import React, { useRef } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { parseCSV, validateLevelData, normalizeColumnNames } from '../utils/csvParser';
import { analyzeLevelFunnel } from '../services/analysisService';

export function Header() {
    const fileInputRef = useRef(null);
    const { setLevelData, setAnalysisResult, setIsAnalyzing, setIsUploading, setError, isUploading, focusMode } = useAppStore();

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            const text = await file.text();
            const parsedData = parseCSV(text);
            const normalizedData = normalizeColumnNames(parsedData);

            const validation = validateLevelData(normalizedData);
            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            setLevelData(normalizedData);
            setIsUploading(false);

            // Trigger AI analysis
            setIsAnalyzing(true);
            try {
                const analysis = await analyzeLevelFunnel(normalizedData, focusMode);
                setAnalysisResult(analysis);
            } catch (aiError) {
                console.error('AI analysis failed:', aiError);
                setError(`AI_ANALYSIS_FAILED: ${aiError.message}. Ensure Gemini API key is valid.`);
            } finally {
                setIsAnalyzing(false);
            }
        } catch (error) {
            setError(error.message);
            setIsUploading(false);
        }

        // Reset input for re-upload
        event.target.value = '';
    };

    return (
        <header className="sticky top-0 z-50 w-full border-b-2 border-industrial-orange bg-cyber-bg px-6 py-4">
            <div className="max-w-[1600px] mx-auto flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="border-2 border-industrial-orange p-1 bg-industrial-orange/5">
                        <span className="material-symbols-outlined text-industrial-orange text-4xl">joystick</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-industrial-orange leading-none tracking-widest">Supersonic ALFA</h1>
                        <p className="text-[10px] font-mono text-industrial-yellow tracking-[0.4em] uppercase">AI_LEVEL_FUNNEL_ANALYZER</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="hidden xl:flex items-center gap-8 border-x-2 border-industrial-orange/20 px-8">
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400">UPLINK_STATUS</p>
                            <p className="text-sm text-industrial-yellow font-mono font-bold">STABLE_001</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400">PACKET_LOSS</p>
                            <p className="text-sm text-red-500 font-mono font-bold">0.00%</p>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="btn-primary text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-2xl">
                            {isUploading ? 'sync' : 'cloud_upload'}
                        </span>
                        {isUploading ? 'UPLOADING...' : 'UPLOAD_CSV'}
                    </button>
                </div>
            </div>
        </header>
    );
}
