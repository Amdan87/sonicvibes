import { create } from 'zustand';

/**
 * Global state store for Supersonic ALFA application
 */
export const useAppStore = create((set, get) => ({
    // Level data from CSV upload
    levelData: null,

    // AI analysis result
    analysisResult: null,

    // Loading states
    isAnalyzing: false,
    isUploading: false,

    // Active tabs
    focusMode: 'balanced', // 'revenue', 'retention', 'balanced'
    deepDiveTab: 'arpu', // 'arpu', 'churn', 'far', 'success_rate'

    // Error state
    error: null,

    // Actions
    setLevelData: (data) => set({ levelData: data, error: null }),

    setAnalysisResult: (result) => set({ analysisResult: result, isAnalyzing: false }),

    setIsAnalyzing: (status) => set({ isAnalyzing: status }),

    setIsUploading: (status) => set({ isUploading: status }),

    setFocusMode: (mode) => set({ focusMode: mode }),

    setDeepDiveTab: (tab) => set({ deepDiveTab: tab }),

    setError: (error) => set({ error, isAnalyzing: false, isUploading: false }),

    reset: () => set({
        levelData: null,
        analysisResult: null,
        isAnalyzing: false,
        isUploading: false,
        focusMode: 'balanced',
        deepDiveTab: 'arpu',
        error: null,
    }),

    // Computed getters
    getMetricData: (metric) => {
        const { levelData } = get();
        if (!levelData) return [];

        const metricMap = {
            'arpu': 'ARPU',
            'churn': 'Churn',
            'far': 'FAR',
            'success_rate': 'Success Rate',
            'aps': 'APS',
            'users': 'Number of Users'
        };

        const column = metricMap[metric] || metric;
        return levelData.map(row => ({
            level: row['Level Number'],
            value: parseFloat(row[column]) || 0
        }));
    }
}));
