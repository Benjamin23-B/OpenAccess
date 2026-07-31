import React from 'react';

interface AnimationControllerProps {
  breathingSpeed: number;
  setBreathingSpeed: (speed: number) => void;
  autoBlink: boolean;
  setAutoBlink: (blink: boolean) => void;
}

export default function AnimationController({ 
  breathingSpeed, 
  setBreathingSpeed, 
  autoBlink, 
  setAutoBlink 
}: AnimationControllerProps) {
  return (
    <div className="w-full bg-gray-950/40 border border-gray-800/40 rounded-xl p-4 mt-4 flex flex-col gap-3 max-w-sm mx-auto text-left shadow-inner">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Breathing Intensity</span>
        <span className="text-xs font-mono text-emerald-400 font-bold">{breathingSpeed.toFixed(1)}x</span>
      </div>
      <input 
        type="range" 
        min="0.5" 
        max="2.5" 
        step="0.1" 
        value={breathingSpeed}
        onChange={(e) => setBreathingSpeed(parseFloat(e.target.value))}
        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
      />

      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Automatic Blinking</span>
        <button 
          onClick={() => setAutoBlink(!autoBlink)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            autoBlink ? 'bg-emerald-500' : 'bg-gray-800'
          }`}
        >
          <span 
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              autoBlink ? 'translate-x-4' : 'translate-x-0'
            }`} 
          />
        </button>
      </div>
    </div>
  );
}
