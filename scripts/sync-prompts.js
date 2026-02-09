const fs = require('fs');
const https = require('https');
const path = require('path');

// Configuration
const CONFIG = {
    analyst: {
        url: 'https://docs.google.com/document/d/1vH9ZVHnXB0htwoDkmwWeqvwNwBval4AXLM7RXrhDuKI/export?format=txt',
        filePath: path.join(__dirname, '../.bmad-core/agents/analyst.md')
    }
    // Add more agents here if needed
};

function fetchContent(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                // If 3xx redirect (Google Docs often redirects export links)
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    return fetchContent(res.headers.location).then(resolve).catch(reject);
                }
                reject(new Error(`Failed to fetch: ${res.statusCode}`));
                return;
            }

            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function updateAgent(agentName, config) {
    console.log(`[${agentName}] Fetching new prompt...`);

    try {
        const newPrompt = await fetchContent(config.url);

        let fileContent = fs.readFileSync(config.filePath, 'utf8');

        // Regex to match the customization block
        // Matches "customization: |" followed by indented content, stopping before the next top-level or matching indentation key
        // We assume customization is inside 'agent:' section and 'persona:' follows it or it ends the block.
        // Based on the file logic: 
        // agent:
        //   ...
        //   customization: |
        //     CONTENT
        // 
        // persona:

        const customizationMarker = '  customization: |';
        const nextSectionMarker = '\npersona:';

        const startIndex = fileContent.indexOf(customizationMarker);
        if (startIndex === -1) {
            throw new Error('Could not find "customization: |" in ' + config.filePath);
        }

        const endIndex = fileContent.indexOf(nextSectionMarker, startIndex);
        if (endIndex === -1) {
            throw new Error('Could not find next section "persona:" in ' + config.filePath);
        }

        // Indent the new prompt (preserve empty lines)
        const indentedRandomPrompt = newPrompt
            .split('\n')
            .map((line) => {
                const trimmed = line.trim();
                return trimmed.length === 0 ? '' : `    ${trimmed}`;
            })
            .join('\n');

        const newFileContent =
            fileContent.substring(0, startIndex + customizationMarker.length) +
            '\n' + indentedRandomPrompt +
            fileContent.substring(endIndex);

        fs.writeFileSync(config.filePath, newFileContent, 'utf8');
        console.log(`[${agentName}] Successfully updated prompt!`);
        return true;

    } catch (error) {
        console.error(`[${agentName}] Error:`, error.message);
        return false;
    }
}

async function main() {
    const analystOk = await updateAgent('analyst', CONFIG.analyst);
    process.exit(analystOk ? 0 : 1);
}

main();
