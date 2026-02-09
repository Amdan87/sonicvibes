import React from 'react';
import { useAppStore } from '../stores/useAppStore';

/**
 * BarChart - Improved bar chart with axis labels and tooltips
 */
function BarChart({ data = [], height = 'h-[256px]', unit = '', unitPrefix = '' }) {
    const [hoveredItem, setHoveredItem] = React.useState(null);
    const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

    if (data.length === 0) return <div className="h-64 flex items-center justify-center text-slate-700 italic border border-white/5 bg-black/20 font-mono text-sm">NO_DATA_AVAILABLE</div>;

    const values = data.map(d => d.value);
    const maxValue = Math.max(...values); // Exactly maximized

    const handleMouseMove = (e, item) => {
        setHoveredItem(item);
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    const formatLabel = (val) => {
        if (unit === '%') return Math.round(val) + '%';
        if (unitPrefix === '$') return '$' + val.toFixed(2);
        return val < 10 ? val.toFixed(1) : Math.round(val);
    };

    return (
        <div className="relative group pt-4">
            {/* Y-Axis Labels */}
            <div className="absolute -left-6 top-4 h-[256px] flex flex-col justify-between text-[10px] text-slate-500 font-mono pointer-events-none pb-2">
                <span>{formatLabel(maxValue)}</span>
                <span>{formatLabel(maxValue / 2)}</span>
                <span>0{unit}</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-2">
                <div
                    className="bar-chart-container ml-6"
                    style={{
                        height: '256px',
                        borderLeft: '1px solid rgba(255,255,255,0.1)',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        minWidth: data.length > 20 ? `${data.length * 12}px` : '100%'
                    }}
                >
                    {data.map((item, index) => {
                        const heightPercent = maxValue > 0 ? Math.max((item.value / maxValue) * 100, 1) : 0;
                        return (
                            <div
                                key={index}
                                className="data-bar hover:bg-industrial-orange transition-colors"
                                style={{
                                    height: `${heightPercent}%`,
                                    minHeight: '2px',
                                    minWidth: '8px'
                                }}
                                onMouseMove={(e) => handleMouseMove(e, item)}
                                onMouseLeave={() => setHoveredItem(null)}
                            ></div>
                        );
                    })}
                </div>

                {/* X-Axis Labels */}
                <div className="flex justify-between items-start mt-2 ml-6 text-[10px] text-slate-500 font-mono" style={{ minWidth: data.length > 20 ? `${data.length * 12}px` : '100%' }}>
                    <span>LVL {data[0]?.level}</span>
                    <span>LVL {data[Math.floor(data.length / 2)]?.level}</span>
                    <span>LVL {data[data.length - 1]?.level}</span>
                </div>
            </div>

            {/* Custom Tooltip */}
            {hoveredItem && (
                <div
                    className="fixed z-50 bg-black border border-industrial-orange p-3 shadow-2xl pointer-events-none"
                    style={{
                        left: `${tooltipPos.x + 15}px`,
                        top: `${tooltipPos.y - 40}px`,
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    <div className="text-[10px] text-industrial-orange font-bold uppercase mb-1">DATA_POINT_INFO</div>
                    <div className="text-white text-sm font-heading">
                        LEVEL: {hoveredItem.level}
                    </div>
                    <div className="text-industrial-yellow text-lg font-bold uppercase">
                        {unitPrefix}{hoveredItem.value.toLocaleString(undefined, { maximumFractionDigits: 5 })}{unit}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * DeepDiveModule - Tabbed interface for detailed metric analysis
 */
export function DeepDiveModule() {
    const { levelData, analysisResult, deepDiveTab, setDeepDiveTab } = useAppStore();

    const tabs = [
        { id: 'arpu', label: 'ARPU' },
        { id: 'churn', label: 'CHURN' },
        { id: 'far', label: 'FAR' },
        { id: 'success_rate', label: 'SUCCESS_RATE' }
    ];

    const columnMap = {
        'arpu': 'ARPU',
        'churn': 'Churn',
        'far': 'FAR',
        'success_rate': 'Success Rate'
    };

    // Get data for selected metric
    const getMetricData = () => {
        if (!levelData) return [];
        const column = columnMap[deepDiveTab];
        return levelData.map(row => {
            let val = parseFloat(row[column]) || 0;
            // Percentage normalization
            if ((deepDiveTab === 'churn' || deepDiveTab === 'far' || deepDiveTab === 'success_rate') && val <= 1 && val > 0) {
                val *= 100;
            }
            return {
                level: row['Level Number'],
                value: val
            };
        });
    };

    const calculatePeak = () => {
        if (!levelData) return '$42.08';
        const column = columnMap[deepDiveTab];
        const values = levelData.map(row => {
            let val = parseFloat(row[column]) || 0;
            if ((deepDiveTab === 'churn' || deepDiveTab === 'far' || deepDiveTab === 'success_rate') && val <= 1 && val > 0) {
                val *= 100;
            }
            return val;
        });
        const peak = Math.max(...values);
        if (deepDiveTab === 'arpu') return `$${peak.toFixed(2)}`;
        return `${peak.toFixed(1)}%`;
    };

    const calculateAverage = () => {
        if (!levelData || levelData.length === 0) return '---';
        const column = columnMap[deepDiveTab];
        const values = levelData.map(row => {
            let val = parseFloat(row[column]) || 0;
            if ((deepDiveTab === 'churn' || deepDiveTab === 'far' || deepDiveTab === 'success_rate') && val <= 1 && val > 0) {
                val *= 100;
            }
            return val;
        });
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (deepDiveTab === 'arpu') return `$${avg.toFixed(3)}`;
        return `${avg.toFixed(1)}%`;
    };

    const getGaugeValue = () => {
        if (!levelData) return 75;
        const column = columnMap[deepDiveTab];
        const values = levelData.map(row => {
            let val = parseFloat(row[column]) || 0;
            if (val > 1) val /= 100;
            return val;
        });
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        if (deepDiveTab === 'churn') return Math.round((1 - avg) * 100);
        return Math.round(avg * 100);
    };

    const metricData = getMetricData();
    const displayData = metricData.length > 0
        ? metricData
        : Array.from({ length: 9 }, (_, i) => ({ level: i + 1, value: 30 + Math.random() * 60 }));

    // Get analysis recommendations for this metric
    const getRecommendations = () => {
        if (!analysisResult?.recommendations) {
            return [
                `> ${deepDiveTab.toUpperCase()}_TREND: +4.2% OVER_7D`,
                'Revenue generation remains nominal.',
                'Cross-referencing behavioral patterns...'
            ];
        }
        // Filter recommendations related to current tab
        const filtered = analysisResult.recommendations.filter(r =>
            r.toLowerCase().includes(deepDiveTab) ||
            r.toLowerCase().includes(columnMap[deepDiveTab].toLowerCase())
        );
        return filtered.length > 0 ? filtered : analysisResult.recommendations.slice(0, 3);
    };

    const recommendations = getRecommendations();

    return (
        <section className="bg-cyber-panel border-2 border-industrial-orange/10">
            {/* Tab Navigation */}
            <div className="flex overflow-x-auto custom-scrollbar p-6 gap-6 bg-black/40 border-b border-industrial-orange/10">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setDeepDiveTab(tab.id)}
                        className={`recessed-tab flex-shrink-0 ${deepDiveTab === tab.id ? 'recessed-tab-active' : 'recessed-tab-inactive'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <h3 className="text-3xl font-heading text-white">
                                {deepDiveTab.toUpperCase()}_STREAM_DISTRIBUTION
                            </h3>
                            <div className="segmented-gauge">
                                <span className="text-[10px] text-industrial-orange mx-1 font-bold">
                                    {String(getGaugeValue()).padStart(3, '0')}
                                </span>
                                {Array.from({ length: 7 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`gauge-block ${i < Math.ceil(getGaugeValue() / 15) ? 'active' : ''}`}
                                    ></div>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-8 text-right underline-offset-4">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">Average</p>
                                <p className="text-2xl text-industrial-orange font-bold font-heading">{calculateAverage()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase">Peak_Val</p>
                                <p className="text-2xl text-white font-bold font-heading">{calculatePeak()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart */}
                    <BarChart
                        data={displayData}
                        unit={deepDiveTab === 'arpu' ? '' : '%'}
                        unitPrefix={deepDiveTab === 'arpu' ? '$' : ''}
                    />
                </div>

                {/* Analysis Sidebar */}
                <div className="bg-black border-2 border-industrial-orange p-6 space-y-4">
                    <div className="flex items-center gap-2 border-b border-industrial-orange/30 pb-2">
                        <span className="material-symbols-outlined text-industrial-orange text-sm">terminal</span>
                        <h4 className="text-xl text-industrial-orange">ANALYSIS_MODULE</h4>
                    </div>

                    <div className="space-y-4 font-mono text-sm">
                        {/* Dynamic Insight */}
                        <div className="bg-industrial-orange/5 p-3 border border-industrial-orange/10">
                            <p className="text-industrial-orange">
                                {recommendations[0]}
                            </p>
                        </div>

                        <p className="text-slate-400 text-xs">
                            {recommendations[1] || 'Analyzing behavioral patterns across segments...'}
                        </p>

                        <div className="pt-4 border-t border-white/10">
                            <p className="text-white font-bold mb-2">SUGGESTED_PROTOCOL:</p>
                            <ul className="text-[10px] space-y-1 text-slate-500 uppercase">
                                <li>- OPTIMIZE_{deepDiveTab.toUpperCase()}_FLOW</li>
                                <li>- DEPLOY_DYNAMIC_ADJUSTMENT</li>
                                <li>- MONITOR_SEGMENT_RESPONSE</li>
                            </ul>
                        </div>
                    </div>

                    <button className="w-full border border-industrial-orange text-industrial-orange py-2 font-heading text-lg hover:bg-industrial-orange hover:text-black transition-all">
                        GENERATE_REPORT
                    </button>
                </div>
            </div>
        </section>
    );
}
