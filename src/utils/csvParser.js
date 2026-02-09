/**
 * CSV Parser utility for level data
 * Parses CSV text into array of objects with proper type conversion
 */

/**
 * Parse CSV text content into an array of objects
 * @param {string} csvText - Raw CSV content
 * @returns {Array<Object>} Array of row objects with column headers as keys
 */
export function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error('CSV must have at least a header row and one data row');
    }

    // Parse header row
    const headers = parseCSVRow(lines[0]);

    // Parse data rows
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVRow(line);
        const row = {};

        headers.forEach((header, index) => {
            const rawValue = (values[index] || '').trim();
            // Try to convert to number, stripping commas first
            const cleanValue = rawValue.replace(/,/g, '');
            const numValue = parseFloat(cleanValue);

            // Only use numeric value if the resulting string matches (to avoid parsing things like "Version 1.2" as 1.2)
            // but for commas we specifically want to handle them.
            // If the cleaned value is a valid number and not empty, use it.
            if (cleanValue !== '' && !isNaN(numValue) && /^-?\d*\.?\d+$/.test(cleanValue)) {
                row[header.trim()] = numValue;
            } else {
                row[header.trim()] = rawValue;
            }
        });

        data.push(row);
    }

    return data;
}

/**
 * Parse a single CSV row handling quoted values
 * @param {string} row - CSV row string
 * @returns {Array<string>} Array of cell values
 */
function parseCSVRow(row) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

/**
 * Validate that CSV data has required columns
 * @param {Array<Object>} data - Parsed CSV data
 * @returns {Object} Validation result with isValid and missing columns
 */
export function validateLevelData(data) {
    const requiredColumns = [
        'Level Number',
        'Number of Users',
        'APS',
        'Success Rate',
        'FAR',
        'Churn',
        'ARPU'
    ];

    if (!data || data.length === 0) {
        return { isValid: false, missing: requiredColumns, message: 'No data found in CSV' };
    }

    const headers = Object.keys(data[0]);
    const missing = requiredColumns.filter(col =>
        !headers.some(h => h.toLowerCase() === col.toLowerCase())
    );

    if (missing.length > 0) {
        return {
            isValid: false,
            missing,
            message: `Missing required columns: ${missing.join(', ')}`
        };
    }

    return { isValid: true, missing: [], message: 'Data validated successfully' };
}

/**
 * Normalize column names to handle case variations
 * @param {Array<Object>} data - Parsed CSV data
 * @returns {Array<Object>} Data with normalized column names
 */
export function normalizeColumnNames(data) {
    const columnMap = {
        'level number': 'Level Number',
        'level': 'Level Number',
        'sw_main_level': 'Level Number',
        'number of users': 'Number of Users',
        'users': 'Number of Users',
        'aps': 'APS',
        'attempts per success': 'APS',
        'success rate': 'Success Rate',
        'successrate': 'Success Rate',
        'far': 'FAR',
        'first attempt rate': 'FAR',
        'churn': 'Churn',
        'churn rate': 'Churn',
        'arpu': 'ARPU',
        'arpul': 'ARPU',
        'revenue': 'ARPU'
    };

    return data.map(row => {
        const normalized = {};
        Object.entries(row).forEach(([key, value]) => {
            const normalizedKey = columnMap[key.toLowerCase()] || key;
            normalized[normalizedKey] = value;
        });
        return normalized;
    });
}
