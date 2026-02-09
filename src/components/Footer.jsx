import React from 'react';

export function Footer() {
    return (
        <footer className="fixed bottom-0 w-full bg-black border-t-2 border-industrial-orange px-6 py-2 flex items-center justify-between text-[10px] font-mono text-white/50 z-[1050]">
            <div className="flex gap-10">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-industrial-orange pulse-glow"></span> SYS_ACTIVE
                </span>
                <span>LATENCY: <span className="text-industrial-yellow font-bold">14MS</span></span>
                <span>CPU_LOAD: <span className="text-industrial-yellow font-bold">22%</span></span>
                <span>AUTH: <span className="text-white font-bold">GUEST_ANALYST</span></span>
            </div>
            <div className="flex gap-8 items-center">
                <span className="text-industrial-orange/80">ENCRYPTION: AES-256-BIT</span>
                <span className="text-slate-500">V.1.0.0-SUPERSONIC</span>
            </div>
        </footer>
    );
}
