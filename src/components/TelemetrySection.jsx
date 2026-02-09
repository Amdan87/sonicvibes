import React from 'react';
import { useAppStore } from '../stores/useAppStore';

/**
 * SegmentedGauge - Visual indicator with segmented blocks
 */
function SegmentedGauge({ value = 0, maxBlocks = 7, label = '' }) {
    const activeBlocks = Math.ceil((value / 100) * maxBlocks);

    return (
        <div className="segmented-gauge">
            {label && <span className="text-[10px] text-industrial-orange mx-1 font-bold">{label}</span>}
            {Array.from({ length: maxBlocks }).map((_, i) => (
                <div key={i} className={`gauge-block ${i < activeBlocks ? 'active' : ''}`}></div>
            ))}
        </div>
    );
}

/**
 * BarChart - Improved bar chart with axis labels and tooltips
 */
function BarChart({ data = [], guideLine = null, height = 'h-64', unit = '' }) {
    const [hoveredItem, setHoveredItem] = React.useState(null);
    const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });

    const displayData = data.length > 0 ? data : [];
    if (displayData.length === 0) return <div className="h-64 flex items-center justify-center text-slate-700 italic border border-white/5 bg-black/20 font-mono">NO_DATA_AVAILABLE</div>;

    const values = displayData.map(d => d.value);
    const maxValue = Math.max(...values); // Exactly maximized

    const handleMouseMove = (e, item) => {
        setHoveredItem(item);
        setTooltipPos({ x: e.clientX, y: e.clientY });
    };

    const formatLabel = (val) => {
        if (unit === '%') return Math.round(val) + '%';
        if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
        if (val >= 1000) return (val / 1000).toFixed(val >= 10000 ? 0 : 1) + 'k';
        return val < 10 ? val.toFixed(1) : Math.round(val);
    };

    return (
        <div className="relative group">
            {/* Y-Axis Labels */}
            <div className="absolute -left-10 top-0 h-[256px] flex flex-col justify-between text-[10px] text-slate-500 font-mono pointer-events-none pr-1">
                <span>{formatLabel(maxValue)}</span>
                <span>{formatLabel(maxValue / 2)}</span>
                <span>0{unit}</span>
            </div>

            <div className="overflow-x-auto custom-scrollbar pb-2">
                <div
                    className="bar-chart-container ml-2"
                    style={{
                        height: '256px',
                        borderLeft: '1px solid rgba(255,255,255,0.1)',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        minWidth: displayData.length > 20 ? `${displayData.length * 12}px` : '100%'
                    }}
                >
                    {guideLine && maxValue > 0 && (
                        <div className="guide-line" style={{ top: `${100 - (guideLine / maxValue * 100)}%` }}></div>
                    )}

                    {displayData.map((item, index) => {
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
                <div className="flex justify-between items-start mt-2 ml-2 text-[10px] text-slate-500 font-mono" style={{ minWidth: displayData.length > 20 ? `${displayData.length * 12}px` : '100%' }}>
                    <span>LVL {displayData[0]?.level}</span>
                    <span>LVL {displayData[Math.floor(displayData.length / 2)]?.level}</span>
                    <span>LVL {displayData[displayData.length - 1]?.level}</span>
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
                        {typeof hoveredItem.value === 'number' ? hoveredItem.value.toLocaleString(undefined, { maximumFractionDigits: 3 }) : hoveredItem.value}{unit}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * TelemetryCard - Individual telemetry metric card
 */
function TelemetryCard({ id, title, metric, gaugeValue, gaugeLabel, average, guideLine, data, unit }) {
    return (
        <section className="bg-cyber-panel border-2 border-industrial-orange/10 p-6 flex flex-col gap-6">
            <div className="space-y-4">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-4">
                            <h4 className="text-lg text-slate-400">{title}</h4>
                            <SegmentedGauge value={gaugeValue} label={gaugeLabel} />
                        </div>
                        <p className="text-[10px] text-slate-600 font-mono">ID: {id}</p>
                    </div>
                    <span className="font-heading text-industrial-orange text-4xl whitespace-nowrap">{average}</span>
                </div>
                <div className="pl-8 pr-4">
                    <BarChart data={data} guideLine={guideLine} unit={unit} />
                </div>
            </div>
        </section>
    );
}

/**
 * TelemetrySection - Main telemetry dashboard section
 */
export function TelemetrySection() {
    const { levelData } = useAppStore();

    // Calculate metrics from level data
    const getMetricData = (column) => {
        if (!levelData) return [];
        return levelData.map(row => {
            let val = parseFloat(row[column]) || 0;
            // Detect if Success Rate is decimal or percentage
            if ((column === 'Success Rate' || column === 'FAR' || column === 'Churn') && val <= 1 && val > 0) {
                val = val * 100;
            }
            return {
                level: row['Level Number'],
                value: val
            };
        });
    };

    const calculateAverage = (column) => {
        if (!levelData || levelData.length === 0) return '---';

        const values = levelData.map(row => {
            let val = parseFloat(row[column]) || 0;
            if ((column === 'Success Rate' || column === 'FAR' || column === 'Churn') && val <= 1 && val > 0) {
                val = val * 100;
            }
            return val;
        });

        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;

        if (column === 'Number of Users') {
            return Math.round(avg).toLocaleString();
        }

        return (column === 'Success Rate' || column === 'FAR' || column === 'Churn')
            ? avg.toFixed(1) + '%'
            : avg.toFixed(2);
    };

    const calculateGaugeValue = (column) => {
        if (!levelData) return 50;
        const values = levelData.map(row => {
            let val = parseFloat(row[column]) || 0;
            if ((column === 'Success Rate' || column === 'FAR' || column === 'Churn') && val > 1) {
                val = val / 100;
            }
            return val;
        });
        const avg = values.reduce((a, b) => a + b, 0) / values.length;

        if (column === 'Success Rate' || column === 'FAR') return avg * 100;
        if (column === 'Churn') return (1 - avg) * 100;
        if (column === 'APS') return Math.max(0, 100 - (avg - 1) * 30);
        return 50;
    };

    const telemetryCards = [
        {
            id: 'APS_X88',
            title: 'TELEMETRY_01: ATTEMPTS_PER_SUCCESS',
            metric: 'APS',
            gaugeLabel: levelData ? String(Math.round(calculateGaugeValue('APS'))).padStart(3, '0') : '042',
            average: levelData ? `${calculateAverage('APS')} AVG` : '2.14 AVG',
            guideLine: 2.5,
            data: getMetricData('APS'),
            unit: ''
        },
        {
            id: 'TUC_X89',
            title: 'TELEMETRY_02: TOTAL_USERS_CONCURRENT',
            metric: 'Number of Users',
            gaugeLabel: levelData ? String(Math.round(calculateGaugeValue('Number of Users'))).padStart(3, '0') : '088',
            average: levelData ? calculateAverage('Number of Users') : '142,805',
            guideLine: null,
            data: getMetricData('Number of Users'),
            unit: ''
        },
        {
            id: 'SR_X92',
            title: 'TELEMETRY_03: COMPLETION_RATE_PERCENTAGE',
            metric: 'Success Rate',
            gaugeLabel: levelData ? String(Math.round(calculateGaugeValue('Success Rate'))).padStart(3, '0') : '065',
            average: levelData ? `${calculateAverage('Success Rate')} AVG` : '82.4% AVG',
            guideLine: 80,
            data: getMetricData('Success Rate'),
            unit: '%'
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <h2 className="text-2xl text-white tracking-[0.2em] font-heading">DATA_MATRIX_STACK // REAL-TIME</h2>
                <div className="flex gap-4 font-mono text-[10px]">
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-industrial-orange pulse-glow"></span> LIVE_FEED
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="w-2 h-0.5 bg-benchmark border border-dashed"></span> DESIRED_THRESHOLD
                    </span>
                </div>
            </div>

            {/* Telemetry Cards */}
            {telemetryCards.map(card => (
                <TelemetryCard key={card.id} {...card} />
            ))}
        </div>
    );
}
