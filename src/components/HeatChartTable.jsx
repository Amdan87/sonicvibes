import React, { useMemo } from 'react';
import { useAppStore } from '../stores/useAppStore';

/**
 * Helper to calculate heatmap color for percentage-based metrics (Success Rate, FAR, Churn)
 * Green (high) to Red (low) for Success Rate/FAR
 * Red (high) to Green (low) for Churn
 */
const getPercentageColor = (value, isInverse = false) => {
    // value is expected to be 0-100
    const normalized = Math.max(0, Math.min(100, value));
    const hue = isInverse ? (normalized * 1.2) : (normalized * 1.2); // 0 (red) to 120 (green)

    // For churn, high is bad (red), low is good (green)
    const effectiveHue = isInverse ? (120 - hue) : hue;

    return `hsla(${effectiveHue}, 70%, 50%, 0.2)`;
};

/**
 * Helper to calculate heatmap color for volume/value metrics (Users, ARPU, APS)
 * Blue (high) to Dark (low)
 */
const getValueColor = (value, max) => {
    if (!max) return 'transparent';
    const intensity = Math.min(1, value / max);
    return `rgba(56, 189, 248, ${intensity * 0.3})`; // Using Tailwind sky-400 equivalent
};

export function HeatChartTable() {
    const { levelData } = useAppStore();

    const stats = useMemo(() => {
        if (!levelData || levelData.length === 0) return null;

        const maxUsers = Math.max(...levelData.map(row => parseFloat(row['Number of Users']) || 0));
        const maxARPU = Math.max(...levelData.map(row => parseFloat(row['ARPU']) || 0));
        const maxAPS = Math.max(...levelData.map(row => parseFloat(row['APS']) || 0));

        return { maxUsers, maxARPU, maxAPS };
    }, [levelData]);

    if (!levelData || levelData.length === 0) {
        return null;
    }

    const columns = [
        { key: 'Level Number', label: 'LVL', type: 'text' },
        { key: 'Number of Users', label: 'USERS', type: 'volume', maxKey: 'maxUsers' },
        { key: 'APS', label: 'APS', type: 'volume', maxKey: 'maxAPS' },
        { key: 'Success Rate', label: 'SUCCESS', type: 'percent', inverse: false },
        { key: 'FAR', label: 'FAR', type: 'percent', inverse: false },
        { key: 'Churn', label: 'CHURN', type: 'percent', inverse: true },
        { key: 'ARPU', label: 'ARPU', type: 'volume', maxKey: 'maxARPU', prefix: '$' }
    ];

    const formatValue = (val, col) => {
        const num = parseFloat(val) || 0;
        if (col.type === 'percent') {
            const displayVal = num <= 1 ? num * 100 : num;
            return displayVal.toFixed(1) + '%';
        }
        if (col.key === 'ARPU') return '$' + num.toFixed(3);
        if (col.key === 'Number of Users') return num.toLocaleString();
        return num.toFixed(2);
    };

    const getCellStyle = (val, col) => {
        const num = parseFloat(val) || 0;
        if (col.type === 'percent') {
            const percent = num <= 1 ? num * 100 : num;
            return { backgroundColor: getPercentageColor(percent, col.inverse) };
        }
        if (col.type === 'volume' && stats) {
            return { backgroundColor: getValueColor(num, stats[col.maxKey]) };
        }
        return {};
    };

    return (
        <section className="bg-cyber-panel border-2 border-industrial-orange/10 mt-8">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-2xl text-white tracking-[0.2em] font-heading flex items-center gap-3">
                    <span className="material-symbols-outlined text-industrial-orange">grid_on</span>
                    DATA_GRID_HEATMAP // FULL_FLIGHT_ANALYSIS
                </h2>
                <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                    Ref_Ident: {levelData.length}_Segments_Verified
                </span>
            </div>

            <div className="overflow-x-auto custom-scrollbar max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                    <thead className="sticky top-0 z-20 bg-black shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                        <tr>
                            {columns.map(col => (
                                <th key={col.key} className="py-4 px-4 text-industrial-orange font-bold border-b border-industrial-orange/20 whitespace-nowrap">
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {levelData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors border-b border-white/5 group">
                                {columns.map(col => (
                                    <td
                                        key={col.key}
                                        className="py-3 px-4 text-white group-hover:text-industrial-yellow transition-colors whitespace-nowrap"
                                        style={getCellStyle(row[col.key], col)}
                                    >
                                        {formatValue(row[col.key], col)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-2 bg-black/40 text-[10px] text-slate-600 flex justify-between px-6 border-t border-white/5">
                <span>SYSTEM_LOG: END_OF_CORE_MATRIX</span>
                <span>SIGNAL_STRENGTH: 100%</span>
            </div>
        </section>
    );
}
