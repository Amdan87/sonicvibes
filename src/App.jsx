import React, { useMemo, useState } from 'react';

function App() {
    const [fileName, setFileName] = useState('');
    const [rows, setRows] = useState([]);
    const [error, setError] = useState('');

    const parseCsv = (text) => {
        const splitCsvLines = (input) => {
            const lines = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < input.length; i += 1) {
                const char = input[i];
                if (char === '"') {
                    if (inQuotes && input[i + 1] === '"') {
                        current += '"';
                        i += 1;
                    } else {
                        inQuotes = !inQuotes;
                        current += char;
                    }
                } else if ((char === '\n' || char === '\r') && !inQuotes) {
                    if (char === '\r' && input[i + 1] === '\n') {
                        i += 1;
                    }
                    if (current.trim().length > 0) {
                        lines.push(current);
                    }
                    current = '';
                } else {
                    current += char;
                }
            }
            if (current.trim().length > 0) {
                lines.push(current);
            }
            return lines;
        };

        const lines = splitCsvLines(text);
        let startIndex = 0;
        if (lines[0] && lines[0].trim().toLowerCase() === 'table 1') {
            startIndex = 1;
        }

        const normalizeHeader = (value) =>
            value
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[^a-z0-9_]/g, '');

        const parseCsvLine = (line) => {
            const values = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < line.length; i += 1) {
                const char = line[i];
                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        current += '"';
                        i += 1;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim());
            return values;
        };

        let headerIndex = -1;
        let headerMap = {};
        for (let i = startIndex; i < lines.length; i += 1) {
            const cols = parseCsvLine(lines[i]);
            if (!cols[0]) continue;
            const normalized = cols.map(normalizeHeader);
            if (
                normalized.includes('sw_main_level') ||
                normalized.includes('levelnumber') ||
                normalized.includes('level') ||
                normalized.includes('levelno')
            ) {
                headerIndex = i;
                normalized.forEach((key, idx) => {
                    if (!key) return;
                    headerMap[key] = idx;
                });
                break;
            }
        }
        if (headerIndex === -1) {
            throw new Error('Could not find a level header row.');
        }

        const dataLines = lines.slice(headerIndex + 1);
        const parsed = [];

        const parsePercent = (value) => {
            if (!value) return null;
            const cleaned = value.trim();
            if (!cleaned) return null;
            if (cleaned.endsWith('%')) return Number.parseFloat(cleaned.replace('%', ''));
            const numeric = Number.parseFloat(cleaned);
            return Number.isNaN(numeric) ? null : numeric;
        };

        const parseNumber = (value) => {
            if (!value) return null;
            const cleaned = value.replace(/"/g, '').replace(/,/g, '').trim();
            if (!cleaned) return null;
            const numeric = Number.parseFloat(cleaned);
            return Number.isNaN(numeric) ? null : numeric;
        };

        const pickValue = (cols, keys) => {
            for (const key of keys) {
                if (headerMap[key] != null) {
                    return cols[headerMap[key]];
                }
            }
            return undefined;
        };

        for (const line of dataLines) {
            const cols = parseCsvLine(line);
            if (!cols.length) continue;
            const levelRaw = pickValue(cols, ['sw_main_level', 'levelnumber', 'level', 'levelno']);
            if (!levelRaw) continue;
            const level = Number.parseInt(levelRaw, 10);
            if (Number.isNaN(level)) continue;
            const usersRaw = pickValue(cols, ['numberofusers', 'users', 'usercount', 'totalusers']);
            parsed.push({
                level,
                users: parseNumber(usersRaw),
                far: parsePercent(pickValue(cols, ['far', 'firstattemptrate'])),
                aps: parseNumber(pickValue(cols, ['aps', 'attemptspersuccess'])),
                arpu: parseNumber(pickValue(cols, ['arpu', 'arpul'])),
                churn: parsePercent(pickValue(cols, ['churn', 'churnrate'])),
                success: parsePercent(pickValue(cols, ['successrate', 'success'])),
            });
        }
        return parsed;
    };

    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setFileName(file.name);
        setError('');
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const text = reader.result;
                if (typeof text !== 'string') {
                    throw new Error('Unsupported file contents.');
                }
                const parsedRows = parseCsv(text);
                setRows(parsedRows);
            } catch (err) {
                setRows([]);
                setError(err.message || 'Failed to parse CSV.');
            }
        };
        reader.onerror = () => {
            setRows([]);
            setError('Failed to read file.');
        };
        reader.readAsText(file);
    };

    const analytics = useMemo(() => {
        if (rows.length === 0) return null;

        const withMetrics = rows.map((row) => {
            const churn = row.churn ?? 0;
            const aps = row.aps ?? 0;
            const friction = 0.6 * churn + 0.4 * (aps * 10);

            const far = row.far ?? 0;
            const success = row.success ?? 0;
            const insufficient = row.users == null || row.users < 300;

            let difficulty = 'Tuned';
            if (insufficient) {
                difficulty = 'Insufficient Data';
            } else if (aps <= 1.2 && far >= 70 && success >= 95) {
                difficulty = 'Easy';
            } else if (aps >= 2.5 || far < 20 || success < 92) {
                difficulty = 'Hard';
            } else if ((far < 40 && success >= 94) || (aps >= 2.0 && far >= 60)) {
                difficulty = 'Imbalanced';
            }

            return { ...row, friction, difficulty, insufficient };
        });

        const sufficientRows = withMetrics.filter((row) => !row.insufficient);

        const totalSeries = [];
        sufficientRows.forEach((r) => {
            const users = r.users ?? 0;
            const dropTotal = (users * (r.churn ?? 0)) / 100;
            const unlockTotal = (users * (r.success ?? 0)) / 100;
            totalSeries.push({
                level: r.level,
                dropTotal,
                unlockTotal,
            });
        });

        const segmentSections = () => {
            if (sufficientRows.length === 0) return [];
            const breakpoints = [];
            const churnDelta = 1.25;
            const successDelta = 2.5;
            for (let i = 1; i < sufficientRows.length; i += 1) {
                const prev = sufficientRows[i - 1];
                const curr = sufficientRows[i];
                if (
                    Math.abs((curr.churn ?? 0) - (prev.churn ?? 0)) >= churnDelta ||
                    Math.abs((curr.success ?? 0) - (prev.success ?? 0)) >= successDelta
                ) {
                    breakpoints.push(i);
                }
            }
            const sections = [];
            let start = 0;
            breakpoints.forEach((idx) => {
                if (idx - start >= 10) {
                    sections.push(sufficientRows.slice(start, idx));
                    start = idx;
                }
            });
            if (sufficientRows.length - start > 0) {
                sections.push(sufficientRows.slice(start));
            }
            if (sections.length > 1 && sections[sections.length - 1].length < 10) {
                const tail = sections.pop();
                sections[sections.length - 1].push(...tail);
            }
            return sections;
        };

        const indexToLetters = (index) => {
            const alphabet = 'abcdefghijklmnopqrstuvwxyz';
            let n = index + 1;
            let result = '';
            while (n > 0) {
                n -= 1;
                result = alphabet[n % 26] + result;
                n = Math.floor(n / 26);
            }
            return result.toUpperCase();
        };

        const maxUsers = Math.max(1, ...sufficientRows.map((row) => row.users ?? 0));
        const sections = segmentSections().map((section, index) => {
            const avg = (list, key) =>
                list.reduce((sum, item) => sum + (item[key] ?? 0), 0) / Math.max(list.length, 1);
            const avgChurn = avg(section, 'churn');
            const avgSuccess = avg(section, 'success');
            const avgArpu = avg(section, 'arpu');

            let model = 'Balanced / Staircase';
            const retentionGap = Math.max(0, 90 - avgSuccess);
            if (avgSuccess < 90 && retentionGap / 90 >= 0.3) {
                model = 'Fast Burn / Fast Revenue';
            } else if (avgSuccess >= 90 && avgSuccess <= 95 && avgChurn <= 1.0) {
                model = 'Slow & Steady';
            }

            const startLevel = section[0]?.level;
            const endLevel = section[section.length - 1]?.level;
            const issues = [];
            let easyStreak = 0;

            section.forEach((level, idx) => {
                const userWeight = (level.users ?? 0) / maxUsers;
                const churnScore = (level.churn ?? 0) * 2;
                const successGap = Math.max(0, 90 - (level.success ?? 0));
                const apsScore = (level.aps ?? 0) * 1.5;
                const farPenalty = Math.max(0, 40 - (level.far ?? 0)) * 0.5;
                const severity = userWeight * (churnScore + successGap + apsScore + farPenalty);

                const addIssue = (issue, action, outcome) => {
                    issues.push({
                        level: level.level,
                        issue,
                        action,
                        outcome,
                        severity,
                        kpis: {
                            far: level.far ?? 0,
                            aps: level.aps ?? 0,
                            success: level.success ?? 0,
                            churn: level.churn ?? 0,
                            arpu: level.arpu ?? 0,
                            users: level.users ?? 0,
                        },
                    });
                };

                const isEasy = (level.success ?? 0) >= 95 && (level.far ?? 0) >= 85 && (level.aps ?? 0) <= 1.3;
                const previousEasyStreak = easyStreak;
                easyStreak = isEasy ? easyStreak + 1 : 0;

                if (model === 'Fast Burn / Fast Revenue') {
                    if ((level.aps ?? 0) < 1.6 || (level.far ?? 0) > 80 || (level.success ?? 0) > 90) {
                        addIssue(
                            'Too easy for a pinch point',
                            'Increase difficulty to target 80-88% Success Rate and FAR ~60-70% to drive resource spend.',
                            'Increase ARPU with an accepted churn tradeoff.'
                        );
                    }
                } else if (model === 'Slow & Steady') {
                    if ((level.success ?? 0) < 90 || (level.aps ?? 0) > 2.5 || (level.far ?? 0) < 40) {
                        addIssue(
                            'Below flow channel target',
                            'Reduce difficulty to restore 90-95% completion and FAR ≥ 50%.',
                            'Reduce churn and preserve long-term LTV.'
                        );
                    } else if ((level.far ?? 0) > 90 && (level.aps ?? 0) < 1.1) {
                        addIssue(
                            'Overly easy; missing spike',
                            'Introduce a spike level followed immediately by a relief level.',
                            'Maintain engagement while protecting ARPU.'
                        );
                    }
                    if ((level.success ?? 0) < 88 && section[idx + 1]) {
                        const next = section[idx + 1];
                        if ((next.success ?? 0) < 93) {
                            addIssue(
                                'Missing relief after spike',
                                'Make next level a relief (target 93-96% Success Rate, FAR ≥ 70%).',
                                'Prevent frustration drop-off after spike.'
                            );
                        }
                    }
                } else {
                    if (!isEasy && previousEasyStreak >= 6) {
                        addIssue(
                            'Missing soft pinch in staircase',
                            'Introduce a soft pinch (minor difficulty bump) at this level following the easy streak.',
                            'Convert non-payers without mass churn.'
                        );
                    }
                }
            });

            return {
                id: `Section ${indexToLetters(index)}`,
                startLevel,
                endLevel,
                model,
                averages: { avgChurn, avgSuccess, avgArpu },
                issues,
            };
        });

        const condensedIssues = [];
        const sortedIssues = sections
            .flatMap((section) => section.issues)
            .sort((a, b) => a.level - b.level);
        for (const issue of sortedIssues) {
            const sectionId =
                sections.find((section) => issue.level >= section.startLevel && issue.level <= section.endLevel)?.id ?? '';
            const last = condensedIssues[condensedIssues.length - 1];
            if (
                last &&
                issue.level === last.endLevel + 1 &&
                issue.issue === last.issue &&
                issue.action === last.action &&
                issue.outcome === last.outcome &&
                sectionId === last.sectionId
            ) {
                last.endLevel = issue.level;
            } else {
                condensedIssues.push({
                    startLevel: issue.level,
                    endLevel: issue.level,
                    issue: issue.issue,
                    action: issue.action,
                    outcome: issue.outcome,
                    sectionId,
                });
            }
        }

        const topIssues = sections
            .flatMap((section) =>
                section.issues.map((issue) => ({
                    ...issue,
                    sectionId: section.id,
                    sectionRange: `${section.startLevel}-${section.endLevel}`,
                    model: section.model,
                }))
            )
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 10);

        const executiveSummary = {
            totalLevels: sufficientRows.length,
            excludedLevels: withMetrics.length - sufficientRows.length,
            startingUsers: sufficientRows[0]?.users ?? 0,
            endingUsers: sufficientRows[sufficientRows.length - 1]?.users ?? 0,
            sections: sections.map((section) => ({
                id: section.id,
                range: `${section.startLevel}-${section.endLevel}`,
                model: section.model,
                avgSuccess: section.averages.avgSuccess,
                avgChurn: section.averages.avgChurn,
                avgArpu: section.averages.avgArpu,
            })),
        };

        return {
            rows: withMetrics,
            totalSeries,
            sufficientRows,
            sections,
            condensedIssues,
            topIssues,
            executiveSummary,
        };
    }, [rows]);

    const StackedBarChart = ({
        data,
        getDrop,
        getUnlock,
        title,
        subtitle,
        yAxisLabel,
        maxValue,
        valueFormatter,
    }) => {
        const barWidth = 6;
        const gap = 2;
        const chartHeight = 200;
        const leftPadding = 40;
        const bottomPadding = 24;
        const width = leftPadding + data.length * (barWidth + gap);
        const computedMax = maxValue ?? 100;
        const viewHeight = chartHeight + bottomPadding + 20;
        const tickValues =
            computedMax === 100
                ? [0, 25, 50, 75, 100]
                : [0, computedMax * 0.25, computedMax * 0.5, computedMax * 0.75, computedMax];
        const levelLabelStep = data.length > 140 ? 10 : data.length > 60 ? 5 : 1;

        return (
            <div className="chart-panel">
                <div className="chart-header">
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                </div>
                <div className="legend">
                    <span className="legend-item">
                        <span className="legend-swatch unlock" /> Unlock Next Rate
                    </span>
                    <span className="legend-item">
                        <span className="legend-swatch drop" /> Drop Rate
                    </span>
                </div>
                <div className="chart-scroll">
                    <svg width={width} height={viewHeight} className="chart-svg">
                        {tickValues.map((value) => {
                            const y = chartHeight - (value / computedMax) * chartHeight;
                            return (
                                <g key={`tick-${value}`}>
                                    <line
                                        x1={leftPadding}
                                        x2={width}
                                        y1={y}
                                        y2={y}
                                        stroke="rgba(148, 163, 184, 0.2)"
                                        strokeDasharray="4 4"
                                    />
                                    <text x={0} y={y + 4} fill="#94a3b8" fontSize="10">
                                        {valueFormatter ? valueFormatter(value) : `${value}%`}
                                    </text>
                                </g>
                            );
                        })}
                        <text x={0} y={12} fill="#94a3b8" fontSize="11">
                            {yAxisLabel}
                        </text>
                        {data.map((item, index) => {
                            const dropValue = Math.min(Math.max(getDrop(item), 0), computedMax);
                            const unlockValue = Math.min(Math.max(getUnlock(item), 0), computedMax);
                            const dropHeight = (dropValue / computedMax) * chartHeight;
                            const unlockHeight = (unlockValue / computedMax) * chartHeight;
                            const x = leftPadding + index * (barWidth + gap);
                            const yDrop = chartHeight - dropHeight;
                            const yUnlock = yDrop - unlockHeight;
                            return (
                                <g key={item.level}>
                                    <rect
                                        x={x}
                                        y={yUnlock}
                                        width={barWidth}
                                        height={unlockHeight}
                                        fill="#ef4444"
                                    >
                                        <title>
                                            Level {item.level} | Unlock:{' '}
                                            {valueFormatter ? valueFormatter(unlockValue) : `${unlockValue.toFixed(2)}%`} | Drop:{' '}
                                            {valueFormatter ? valueFormatter(dropValue) : `${dropValue.toFixed(2)}%`}
                                        </title>
                                    </rect>
                                    <rect
                                        x={x}
                                        y={yDrop}
                                        width={barWidth}
                                        height={dropHeight}
                                        fill="#3b82f6"
                                    />
                                    {item.level % levelLabelStep === 0 && (
                                        <text
                                            x={x + barWidth / 2}
                                            y={chartHeight + 16}
                                            fill="#94a3b8"
                                            fontSize="9"
                                            textAnchor="middle"
                                        >
                                            {item.level}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        <text
                            x={leftPadding + (data.length * (barWidth + gap)) / 2}
                            y={chartHeight + bottomPadding}
                            fill="#94a3b8"
                            fontSize="11"
                            textAnchor="middle"
                        >
                            Level
                        </text>
                    </svg>
                </div>
            </div>
        );
    };

    return (
        <div className="container" style={{ padding: '3rem 2rem', maxWidth: '1400px', margin: '0 auto' }}>
            <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <h1 className="title-gradient" style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>
                    Level Funnel Analyzer
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Upload a CSV to generate friction analysis, churn insights, and monetization recommendations.
                </p>
            </header>

            <section className="glass-panel" style={{ marginBottom: '2rem' }}>
                <div className="upload-panel">
                    <div>
                        <h2>Upload Level Funnel CSV</h2>
                        <p>
                            Expected columns: <strong>Level Number</strong>, Number of Users, APS, Success Rate, FAR,
                            Churn, ARPU.
                        </p>
                    </div>
                    <label className="upload-button">
                        <input type="file" accept=".csv" onChange={handleFileChange} />
                        Choose CSV
                    </label>
                </div>
                {fileName && <p className="file-name">Loaded: {fileName}</p>}
                {error && <p className="error-text">{error}</p>}
            </section>

            {analytics && (
                <>
                    <section className="grid-two" style={{ marginBottom: '2rem' }}>
                        <StackedBarChart
                            data={analytics.rows}
                            getDrop={(r) => r.churn ?? 0}
                            getUnlock={(r) => r.success ?? 0}
                            title="Drop Rate vs Unlock Next Rate"
                            subtitle="Per level (stacked share of entrants)."
                            yAxisLabel="Percent"
                            maxValue={100}
                            valueFormatter={(value) => `${value.toFixed(0)}%`}
                        />
                        <StackedBarChart
                            data={analytics.totalSeries}
                            getDrop={(r) => r.dropTotal ?? 0}
                            getUnlock={(r) => r.unlockTotal ?? 0}
                            title="Drop vs Unlock (Total Users)"
                            subtitle="Per level scaled to original cohort size."
                            yAxisLabel="Users"
                            maxValue={Math.max(
                                1,
                                ...analytics.totalSeries.map((item) =>
                                    Math.max(item.dropTotal ?? 0, item.unlockTotal ?? 0)
                                )
                            )}
                            valueFormatter={(value) => Math.round(value).toLocaleString()}
                        />
                    </section>

                    <section className="glass-panel" style={{ marginBottom: '2rem' }}>
                        <h2>1. Executive Summary</h2>
                        <p className="muted">
                            Analysis excludes levels with fewer than 300 users. {analytics.executiveSummary.excludedLevels} level(s) are marked as Insufficient Data.
                        </p>
                        <p className="muted">
                            Overall trajectory: {analytics.executiveSummary.startingUsers.toLocaleString()} →{' '}
                            {analytics.executiveSummary.endingUsers.toLocaleString()} users across analyzed levels (
                            {analytics.executiveSummary.startingUsers > 0
                                ? `${(
                                      ((analytics.executiveSummary.startingUsers - analytics.executiveSummary.endingUsers) /
                                          analytics.executiveSummary.startingUsers) *
                                      100
                                  ).toFixed(1)}% total drop`
                                : '0.0% total drop'}
                            ).
                        </p>
                        <div className="insight-list">
                            {analytics.executiveSummary.sections.map((section) => (
                                <div key={section.id} className="segment-card">
                                    <h4>
                                        {section.id} (Levels {section.range}): {section.model}
                                    </h4>
                                    <p className="muted">
                                        Avg Success {section.avgSuccess.toFixed(2)}%, Avg Churn {section.avgChurn.toFixed(2)}%, Avg ARPU {section.avgArpu.toFixed(2)}.
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="glass-panel" style={{ marginBottom: '2rem' }}>
                        <h2>3. Specific Optimization Recommendations</h2>
                        <div className="insight-list">
                            {analytics.topIssues.map((issue) => (
                                <div key={`top-${issue.level}-${issue.issue}`} className="segment-card">
                                    <h4>
                                        Level {issue.level} · {issue.sectionId} ({issue.sectionRange}) · {issue.model}
                                    </h4>
                                    <p>
                                        <strong>Current Issue:</strong> {issue.issue}
                                    </p>
                                    <p>
                                        <strong>Recommended Action:</strong> {issue.action}
                                    </p>
                                    <p>
                                        <strong>Expected Outcome:</strong> {issue.outcome}
                                    </p>
                                    <p className="muted">
                                        KPIs: FAR {issue.kpis.far.toFixed(2)}%, APS {issue.kpis.aps.toFixed(2)}, Success {issue.kpis.success.toFixed(2)}%, Churn{' '}
                                        {issue.kpis.churn.toFixed(2)}%, ARPU {issue.kpis.arpu.toFixed(2)}, Users {issue.kpis.users.toLocaleString()}.
                                    </p>
                                </div>
                            ))}
                            {analytics.topIssues.length === 0 && <p className="muted">No critical action items identified.</p>}
                        </div>
                    </section>

                    <section className="glass-panel" style={{ marginBottom: '2rem' }}>
                        <h2>4. Full recommendation Table</h2>
                        <div className="table-scroll">
                            <table className="kpi-table">
                                <thead>
                                    <tr>
                                        <th>Section</th>
                                        <th>Level Range</th>
                                        <th>Current Issue</th>
                                        <th>Recommended Action</th>
                                        <th>Expected Outcome</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.condensedIssues.map((issue) => (
                                        <tr key={`issue-${issue.sectionId}-${issue.startLevel}-${issue.endLevel}-${issue.issue}`}>
                                            <td>{issue.sectionId}</td>
                                            <td>
                                                {issue.startLevel === issue.endLevel
                                                    ? issue.startLevel
                                                    : `${issue.startLevel}-${issue.endLevel}`}
                                            </td>
                                            <td>{issue.issue}</td>
                                            <td>{issue.action}</td>
                                            <td>{issue.outcome}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="glass-panel">
                        <h3>KPI Dashboard</h3>
                        <p className="muted">
                            Friction Score = 0.6 × Churn% + 0.4 × (APS × 10). Difficulty is derived from FAR, APS, and
                            Success Rate.
                        </p>
                        <div className="table-scroll">
                            <table className="kpi-table">
                                <thead>
                                    <tr>
                                        <th>Level</th>
                                        <th>Users</th>
                                        <th>FAR</th>
                                        <th>APS</th>
                                        <th>ARPU</th>
                                        <th>Churn</th>
                                        <th>Success</th>
                                        <th>Difficulty</th>
                                        <th>Friction</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics.rows.map((row) => (
                                        <tr key={`row-${row.level}`}>
                                            <td>{row.level}</td>
                                            <td>{row.users != null ? row.users.toLocaleString() : '—'}</td>
                                            <td>{row.far != null ? `${row.far.toFixed(2)}%` : '—'}</td>
                                            <td>{row.aps != null ? row.aps.toFixed(2) : '—'}</td>
                                            <td>{row.arpu != null ? row.arpu.toFixed(2) : '—'}</td>
                                            <td>{row.churn != null ? `${row.churn.toFixed(2)}%` : '—'}</td>
                                            <td>{row.success != null ? `${row.success.toFixed(2)}%` : '—'}</td>
                                            <td>{row.difficulty}</td>
                                            <td>{row.friction.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}

export default App;
