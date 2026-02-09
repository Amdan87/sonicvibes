import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Analysis service for level funnel data using Google Generative AI
 */

// Initialize Google AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// Latest analysis prompt from Google Doc
const DEFAULT_ANALYSIS_PROMPT = `Role: You are an expert Mobile Game Product Manager and Level Designer specializing in economy balancing and funnel optimization. You possess deep knowledge of player psychology, "Flow" theory, and monetization mechanics.
Objective: Analyze the provided level data table to optimize the funnel for maximum revenue. Your goal is to identify the mathematical "sweet spot" between user churn/retention and revenue per user (ARPU).

Input Data Definitions:
* Level Number: The index/order of the level.
* Number of Users: Total users who reached this specific level.
* APS (Attempts per Success): Average number of attempts required to beat the level.
* Success Rate: Percentage of users who completed the level.
* FAR (First Attempt Rate): Percentage of users who beat the level on their first try.
* Churn: Percentage of users who quit the game entirely at this level.
* ARPU: Average Revenue Per User generated specifically at this level.

CRITICAL CONSTRAINT: Statistical Significance
STOP AND READ: You MUST NOT analyze or provide recommendations for any level where the "Number of Users" is less than 300.
* If a level has <300 users, mark it as "Insufficient Data" and skip it.
* Basing decisions on low-volume data is a hallucinations risk and is strictly forbidden.

Theoretical Frameworks:
1. The "Flow Channel" & Funnel Dynamics
* Theory: Engagement exists between Boredom (too easy) and Anxiety (too hard).
* Rule: Win rates must not decrease linearly.
* Spike: A difficult "blocker" level to test skill and drain resources.
* Relief: An easy "candy" level immediately following a Spike to reduce frustration and prevent churn.

2. Core Strategic Framework
A. The "Butterfly Effect" & KPI Dependency
Difficulty is a chain reaction. A change in Level N directly impacts Level N+1, N+2, etc. Increasing the FAR of a hard level inherently makes subsequent levels easier to pass, as the users who survive are higher quality/more invested, whereas a very easy level allows "low-quality" users to pass through, potentially spiking churn at the next difficulty increase.

B. Funnel Phase Logic
* Phase 1: Early Funnel (Levels 1– 40):
   * Goal: Early conversion + Retention.
   * Constraint: APS must not exceed 3.0. If a level is difficult, it must be tuned to become significantly easier on attempt 2 or 3.
   * FAR: Can be low (even reaching 0% in rare spikes), provided the APS cap is respected.
* Phase 2: Mid-to-Late Funnel (Level 41+):
   * Goal: Monetization through investment.
   * Constraint: APS can scale gradually to 10.0+. High APS here acts as a monetization driver with lower churn risk due to the player's "sunk cost."

C. The Blocker Level Strategy
* Purpose: Drain player resources (boosters/currency) and identify "Hooked" players.
* Trigger: Once a player clears a Blocker Level, the game can safely increase the baseline difficulty for all subsequent levels.
* Churn rate can be high. And it's ok

D. The Relief Level Strategy
* Purpose: to make sure the use having fun without pressure.
* Rule: at the beginning of the funnel, Relief levels can have far ≈90%+ in mid and late funnel, the relief levels should not be above ≈85% FAR

3. Difficulty Introduction & Rhythms
* Post-Tutorial Friction (Levels 5–20): After the initial tutorial sequence, identify the first level where FAR < 90%. From that point, implement a "Gradual Squeeze": reduce the FAR (not every level) to bridge the gap between "guaranteed win" and "earned victory."
* Pulse Difficulty Model (Baseline FAR < 10%): Once the baseline FAR drops below 10%, transition into a "Pulse" model. Introduce a "Hard" level (10%–30% FAR) every 3 to 4 levels. This creates a rhythm of Tension (the hard level) and Release (the easier levels following it).

4. Strategic Funnel Models You must classify sections of the funnel into one of these three models based on the user behavior data:
* Model A: "Fast Burn / Fast Revenue" (High Churn Sections)
   * Context: Sections with naturally high drop-off/low completion where fixing retention requires >30% improvement (unrealistic).
   * Strategy: Accept churn, optimize for immediate revenue.
   * Execution: Implement aggressive "Pinch Points" (statistically unfair levels) to force resource depletion.
   * Goal: Maximize ARPU at the expense of Retention.

* Model B: "Slow and Steady" (High Retention Sections)
   * Context: Long sections with high completion rates and healthy baseline revenue.
   * Strategy: Prioritize the "Flow Channel" to build habit and LTV.
   * Execution: Maintain 90-95% Completion Rate. Use "Spikes" followed immediately by "Relief" levels.
   * Goal: Maximize ARPU over a long stretch (LTV) rather than a single level.

* Model C: "Balanced / Staircase" (Hybrid/Transition)
   * Context: Transitions between models or general progression.
   * Strategy: A mix of engagement and controlled spend bursts.
   * Execution: 5-6 high-confidence levels followed by 1 "Soft Pinch" (skill check or small spend).
   * Goal: Convert non-payers without causing mass churn.

Instructions for Analysis:
Step 1: Data Validation Scan the data. Filter out any levels with <300 users.
Step 2: Segmentation (Break Down the Funnel) Group the levels into distinct "Sections" based on user behavior trajectories. A section must be at least 10 levels.
Step 3: Model Assignment Assign one of the three Strategic Models (Fast Burn, Slow & Steady, or Balanced) to each Section based on its performance and optimization goals.
Step 4: Actionable Recommendations For each Section, identify the specific levels that are failing their assigned Model. Provide precise instructions on how to fix them.

Output Format:
Please structure your response exactly as follows:
1. Executive Summary
* High-level view of the funnel health
* Detailed assessment of the overall trajectory of the funnel (Early, Mid, Late loss/retention)
* Details on spike level intervals and revenue generation

3. Specific Optimization Recommendations
* Top 10 critical action items to optimize the funnel.
* Detailed description of changes needed, citing KPIs & reasoning (e.g. "Level 20 is a Spike but has 90% FAR").

4. Full recommendation Table
* Table/List: Section | Current Issue | Recommended Action | Expected Outcome

Focus Mode: {focusMode}
- revenue_focused: Prioritize ARPU optimization, accept higher churn
- retention_focused: Prioritize player retention and LTV
- balanced: Balance between immediate revenue and long-term retention

Analyze the following level data:
{levelData}`;

/**
 * Fetch the analysis prompt from Google Doc
 * Falls back to default prompt if fetch fails
 */
async function fetchPromptFromGoogleDoc() {
    const GOOGLE_DOC_URL = 'https://docs.google.com/document/d/1vH9ZVHnXB0htwoDkmwWeqvwNwBval4AXLM7RXrhDuKI/export?format=txt';

    try {
        const response = await fetch(GOOGLE_DOC_URL);
        if (!response.ok) {
            console.warn('Failed to fetch Google Doc, using default prompt');
            return null;
        }
        const text = await response.text();

        // Clean up the text and ensure it includes the necessary placeholders if missing
        let cleanedText = text.trim();
        if (!cleanedText.includes('{focusMode}')) {
            cleanedText += '\n\nFocus Mode: {focusMode}\n- revenue_focused: Prioritize ARPU optimization, accept higher churn\n- retention_focused: Prioritize player retention and LTV\n- balanced: Balance between immediate revenue and long-term retention';
        }
        if (!cleanedText.includes('{levelData}')) {
            cleanedText += '\n\nAnalyze the following level data:\n{levelData}';
        }

        return cleanedText;
    } catch (error) {
        console.warn('Error fetching Google Doc:', error);
        return null;
    }
}

/**
 * Analyze level funnel data using Google Generative AI
 * @param {Array<Object>} levelData - Parsed level data
 * @param {string} focusMode - Analysis focus: 'revenue', 'retention', or 'balanced'
 * @returns {Promise<Object>} Analysis result with executive summary and recommendations
 */
export async function analyzeLevelFunnel(levelData, focusMode = 'balanced') {
    try {
        // Try to fetch latest prompt from Google Doc
        const googleDocPrompt = await fetchPromptFromGoogleDoc();
        const basePrompt = googleDocPrompt || DEFAULT_ANALYSIS_PROMPT;

        // Format level data as a table for the prompt
        const headers = Object.keys(levelData[0]);
        const tableHeader = headers.join(' | ');
        const tableRows = levelData.map(row =>
            headers.map(h => row[h]).join(' | ')
        ).join('\n');

        const formattedData = `${tableHeader}\n${'---'.repeat(headers.length)}\n${tableRows}`;

        // Build the prompt
        const prompt = basePrompt
            .replace('{focusMode}', focusMode)
            .replace('{levelData}', formattedData);

        // Call Google Generative AI
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse the response into structured sections
        return parseAnalysisResponse(text);
    } catch (error) {
        console.error('Analysis failed:', error);
        throw new Error(`Analysis failed: ${error.message}`);
    }
}

/**
 * Parse AI response into structured sections
 * @param {string} response - Raw AI response text
 * @returns {Object} Parsed analysis with sections
 */
function parseAnalysisResponse(response) {
    const sections = {
        executiveSummary: '',
        segmentation: '',
        recommendations: [],
        fullTable: '',
        rawResponse: response
    };

    // Extract executive summary (Section 1)
    const execMatch = response.match(/(?:1\.?\s*)?Executive Summary[:\s]*\n([\s\S]*?)(?=\n(?:2|3|4)\.?|\n##|$)/i);
    if (execMatch) {
        sections.executiveSummary = execMatch[1].trim();
    } else {
        // If no clear section, use first paragraph
        const paragraphs = response.split('\n\n');
        sections.executiveSummary = paragraphs[0].substring(0, 1000);
    }

    // Extract optimization recommendations (Section 3)
    const recoMatch = response.match(/(?:3\.?\s*)?(?:Specific )?Optimization Recommendation[s]?[:\s]*\n([\s\S]*?)(?=\n4\.?|Full.*Table|$)/i);
    if (recoMatch) {
        const recoText = recoMatch[1];
        const recoItems = recoText.match(/(?:^|\n)\s*(?:\d+\.|-|\*)\s*(.+)/g) || [];
        sections.recommendations = recoItems.map(r => r.replace(/^[\s\d\.\-\*]+/, '').trim());
    } else {
        // Fallback: look for any list items if recommendations weren't found in a labeled section
        const genericRecoMatch = response.match(/(?:^|\n)(?:\d+\.|-|\*)\s*(.+)/g);
        if (genericRecoMatch && sections.recommendations.length === 0) {
            sections.recommendations = genericRecoMatch.slice(0, 10).map(r => r.replace(/^[\s\d\.\-\*]+/, '').trim());
        }
    }

    // Extract segmentation (sometimes still provided or implicitly in summary)
    const segMatch = response.match(/(?:2\.?\s*)?Segment[ation]*[:\s]*\n([\s\S]*?)(?=\n(?:3|4)\.?|$)/i);
    if (segMatch) {
        sections.segmentation = segMatch[1].trim();
    }

    return sections;
}

