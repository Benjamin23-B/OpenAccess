import React from 'react';

interface GestureControllerProps {
  currentGesture: string;
  setGesture: (gesture: string) => void;
}

export default function GestureController({ currentGesture, setGesture }: GestureControllerProps) {
  const gestureOptions = [
    { id: 'idle', label: 'Idle', icon: '👤' },
    { id: 'hello', label: 'Hello', icon: '👋' },
    { id: 'thank_you', label: 'Thank You', icon: '🙏' },
    { id: 'yes', label: 'Yes', icon: '✅' },
    { id: 'no', label: 'No', icon: '❌' },
    { id: 'please', label: 'Please', icon: '🥺' },
    { id: 'good', label: 'Good', icon: '👍' },
    { id: 'good_morning', label: 'Morning', icon: '☀️' },
    { id: 'stop', label: 'Stop', icon: '✋' }
  ];

  return (
    <div className="w-full flex flex-wrap items-center justify-center gap-2 mt-4 px-2">
      {gestureOptions.map((g) => (
        <button
          key={g.id}
          onClick={() => setGesture(g.id)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all duration-250 shadow-md ${
            currentGesture === g.id
              ? 'bg-emerald-500 text-gray-950 scale-105 ring-2 ring-emerald-400 ring-offset-2 ring-offset-gray-900'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
          }`}
        >
          <span>{g.icon}</span>
          <span>{g.label}</span>
        </button>
      ))}
    </div>
  );
}
