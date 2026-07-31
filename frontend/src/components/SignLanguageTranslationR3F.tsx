'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Declare R3F intrinsic elements locally to bypass missing TS declarations in React 19 / Next.js environment
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      boxGeometry: any;
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      primitive: any;
    }
  }
}

interface SignLanguageTranslationR3FProps {
  textToSign?: string;
  signingSpeed?: number;
  onStatusChange?: (status: string) => void;
}

// Main Component rendering procedural 3D Skeletal Body
export default function SignLanguageTranslationR3F({
  textToSign = '',
  signingSpeed = 1.0,
  onStatusChange,
}: SignLanguageTranslationR3FProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [showGrid, setShowGrid] = useState(false);
  const [glowMode, setGlowMode] = useState(true);
  const queueRef = useRef<string[]>([]);
  const timeoutRef = useRef<any>(null);
  const orbitControlsRef = useRef<any>(null);

  const KNOWN_MACROS = new Set([
    'hello', 'hi', 'namaste', 'welcome', 'thanks', 'thankyou', 'please', 'sorry', 'help',
    'yes', 'no', 'okay', 'good', 'bad', 'happy', 'sad', 'love', 'friend', 'family',
    'what', 'where', 'who', 'why', 'how', 'when', 'stop', 'go', 'eat', 'water',
    'doctor', 'hospital', 'call', 'danger', 'safe', 'today', 'time',
    '1', '2', '3', '4', '5'
  ]);

  useEffect(() => {
    if (textToSign) {
      const tokens = textToSign
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .split(/\s+/)
        .filter((w) => w.trim().length > 0);

      const expandedTokens: string[] = [];
      tokens.forEach((word) => {
        if (KNOWN_MACROS.has(word) || word.length === 1) {
          expandedTokens.push(word);
        } else {
          // Decompose word into individual letters for fingerspelling
          expandedTokens.push(...word.split(''));
        }
      });

      if (expandedTokens.length > 0) {
        queueRef.current = [...queueRef.current, ...expandedTokens];
        if (!isSigning) {
          processNextWord();
        }
      }
    }
  }, [textToSign]);

  const processNextWord = () => {
    if (queueRef.current.length === 0) {
      setIsSigning(false);
      setCurrentWord('');
      onStatusChange?.('Idle');
      return;
    }

    setIsSigning(true);
    const nextToken = queueRef.current.shift()!;
    setCurrentWord(nextToken);
    
    if (nextToken.length === 1 && /[a-z]/.test(nextToken)) {
      onStatusChange?.(`Spelling Letter: ${nextToken.toUpperCase()}`);
    } else {
      onStatusChange?.(`Signing Word: ${nextToken.toUpperCase()}`);
    }

    const duration = (nextToken.length === 1 ? 800 : 1200) / signingSpeed;
    timeoutRef.current = setTimeout(() => {
      processNextWord();
    }, duration);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleResetCamera = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  };

  return (
    <div
      className="w-full relative overflow-hidden rounded-3xl border border-cyan-500/30 bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04070d] shadow-[0_0_50px_rgba(0,240,255,0.12)] flex flex-col justify-between"
      style={{ minHeight: '480px', height: '100%' }}
      aria-label="3D Skeletal Body Avatar Viewport Box"
    >
      {/* Top Futuristic Viewport HUD Header Bar */}
      <div className="z-20 flex items-center justify-between px-5 py-3.5 bg-slate-900/80 backdrop-blur-md border-b border-cyan-500/20 text-xs font-mono text-cyan-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-cyan-950/70 border border-cyan-500/40 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(0,240,255,0.2)]">
            <span className={`w-2 h-2 rounded-full ${isSigning ? 'bg-cyan-400 animate-ping' : 'bg-emerald-400'}`} />
            <span className="font-semibold text-cyan-200 tracking-wider">
              {isSigning ? 'ANIMATING' : '3D RIG READY'}
            </span>
          </div>
          <span className="hidden sm:inline text-slate-400">ISL Kinematic Engine v2.4</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCamera}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-900/60 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-200 transition-all duration-200 text-[11px]"
            title="Reset 3D Camera View"
          >
            🎯 Recenter
          </button>
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-2.5 py-1 rounded-lg border transition-all duration-200 text-[11px] ${
              showGrid
                ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Toggle Ground Grid"
          >
            🌐 Grid
          </button>
          <button
            onClick={() => setGlowMode(!glowMode)}
            className={`px-2.5 py-1 rounded-lg border transition-all duration-200 text-[11px] ${
              glowMode
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Toggle Neon Glow"
          >
            ✨ Glow
          </button>
        </div>
      </div>

      {/* Sci-Fi Tech Corner Brackets */}
      <div className="absolute top-12 left-3 w-4 h-4 border-l-2 border-t-2 border-cyan-400/60 pointer-events-none z-10" />
      <div className="absolute top-12 right-3 w-4 h-4 border-r-2 border-t-2 border-cyan-400/60 pointer-events-none z-10" />
      <div className="absolute bottom-14 left-3 w-4 h-4 border-l-2 border-b-2 border-cyan-400/60 pointer-events-none z-10" />
      <div className="absolute bottom-14 right-3 w-4 h-4 border-r-2 border-b-2 border-cyan-400/60 pointer-events-none z-10" />

      {/* Central 3D Canvas Area */}
      <div className="w-full flex-1 relative flex items-center justify-center min-h-[380px]">
        <Canvas camera={{ position: [0, -0.5, 1.8], fov: 45 }}>
          {/* Ambient Lighting */}
          <ambientLight intensity={glowMode ? 0.7 : 0.4} />

          {/* Key Cyberpunk Blue Light */}
          <directionalLight position={[2, 3, 4]} intensity={1.2} color="#e6f7ff" castShadow />

          {/* Emerald Backlight */}
          <directionalLight position={[-2, 1, -2]} intensity={glowMode ? 0.9 : 0.4} color="#00ffaa" />

          {/* Soft Bottom Glow */}
          <pointLight position={[0, -1, 1]} intensity={glowMode ? 0.8 : 0.3} color="#00ccff" />

          {/* Optional Interactive Grid Floor */}
          {showGrid && (
            <primitive
              object={new THREE.GridHelper(8, 16, '#00f0ff', '#1e293b')}
              position={[0, -1.15, 0]}
            />
          )}

          {/* 3D Model Removed */}

          {/* Interactive Camera Orbit Controls */}
          <OrbitControls
            ref={orbitControlsRef}
            target={[0, -0.5, 0]}
            enableZoom={true}
            enablePan={true}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 3.5}
          />
        </Canvas>
      </div>
    </div>
  );
}
