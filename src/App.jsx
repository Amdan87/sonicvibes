import React from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AiCorePanel } from './components/AiCorePanel';
import { TelemetrySection } from './components/TelemetrySection';
import { DeepDiveModule } from './components/DeepDiveModule';
import { useAppStore } from './stores/useAppStore';

function App() {
    const { error } = useAppStore();

    return (
        <div className="min-h-screen overflow-x-hidden bg-cyber-bg">
            {/* Scanline overlay effect */}
            <div className="scanline"></div>

            {/* Header */}
            <Header />

            {/* Main Content */}
            <main className="max-w-[1600px] mx-auto p-6 space-y-6 pb-24">
                {/* Error Display */}
                {error && (
                    <div className="bg-red-900/50 border-2 border-red-500 p-4 flex items-center gap-4">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <div>
                            <p className="text-red-400 font-mono text-sm">ERROR_DETECTED</p>
                            <p className="text-white">{error}</p>
                        </div>
                    </div>
                )}

                {/* AI Core Extraction Panel */}
                <AiCorePanel />

                {/* Data Matrix Stack */}
                <section className="bg-cyber-panel border-2 border-industrial-orange/10 p-6">
                    <TelemetrySection />
                </section>

                {/* Deep Dive Module */}
                <DeepDiveModule />
            </main>

            {/* Footer */}
            <Footer />
        </div>
    );
}

export default App;
