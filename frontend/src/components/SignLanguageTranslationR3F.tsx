'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import FreshAvatar3D from './FreshAvatar3D';

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

// Check if browser has hardware WebGL support enabled
function checkWebGLSupport(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

// React Error Boundary to catch R3F / Three.js WebGL context creation failures
class WebGLErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn('Caught WebGL Canvas error in boundary:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Main Component rendering procedural 3D Skeletal Body or 2D Fallback
export default function SignLanguageTranslationR3F({
  textToSign = '',
  signingSpeed = 1.0,
  onStatusChange,
}: SignLanguageTranslationR3FProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [hasWebGL, setHasWebGL] = useState(true);
  const queueRef = useRef<string[]>([]);
  const timeoutRef = useRef<any>(null);
  const orbitControlsRef = useRef<any>(null);

  const KNOWN_MACROS = new Set([
    'hello', 'hi', 'namaste', 'welcome', 'thanks', 'thankyou', 'please', 'sorry', 'help',
    'yes', 'no', 'okay', 'good', 'bad', 'happy', 'sad', 'love', 'friend', 'family',
    'what', 'where', 'who', 'why', 'how', 'when', 'stop', 'go', 'eat', 'water',
    'doctor', 'hospital', 'call', 'danger', 'safe', 'today', 'time',
    'teacher', 'toilet', 'food', 'home',
    '1', '2', '3', '4', '5'
  ]);

  useEffect(() => {
    setHasWebGL(checkWebGLSupport());
  }, []);

  useEffect(() => {
    if (textToSign) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

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
        queueRef.current = expandedTokens;
        processNextWord();
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

  // 2D / CSS Animated Assistive Card Fallback when browser WebGL is disabled
  const Fallback2DView = (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-cyan-300">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col items-center gap-3">
        <div className="text-4xl animate-bounce">🤟</div>
        <h3 className="font-bold text-lg text-white">Sign Language Active</h3>
        
        {currentWord ? (
          <div className="my-3 py-3 px-6 bg-slate-950 border border-cyan-500/50 rounded-xl">
            <span className="text-2xl font-black text-cyan-400 font-mono tracking-widest uppercase">
              {currentWord}
            </span>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {currentWord.length === 1 ? 'Fingerspelling Letter' : 'Gloss Word'}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">Waiting for text input to sign...</p>
        )}

        <div className="text-[11px] text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
          💡 Note: WebGL hardware acceleration is disabled in your browser. Displaying 2D Sign Assistive View.
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center"
      style={{ minHeight: '480px', height: '100%' }}
      aria-label="3D Avatar Viewport Container"
    >
      {!hasWebGL ? (
        Fallback2DView
      ) : (
        <WebGLErrorBoundary fallback={Fallback2DView}>
          <Canvas camera={{ position: [0, 0.2, 1.85], fov: 44 }}>
            {/* Ambient Lighting */}
            <ambientLight intensity={0.7} />

            {/* Key Cyberpunk Blue Light */}
            <directionalLight position={[2, 3, 4]} intensity={1.2} color="#e6f7ff" castShadow />

            {/* Emerald Backlight */}
            <directionalLight position={[-2, 1, -2]} intensity={0.9} color="#00ffaa" />

            {/* Soft Bottom Glow */}
            <pointLight position={[0, -1, 1]} intensity={0.8} color="#00ccff" />

            {/* Fresh 3D Head, Body & Hands Humanoid Avatar Model */}
            <FreshAvatar3D
              currentWord={currentWord}
              isSigning={isSigning}
              signingSpeed={signingSpeed}
            />

            {/* Interactive Camera Orbit Controls */}
            <OrbitControls
              ref={orbitControlsRef}
              target={[0, 0.2, 0]}
              enableZoom={true}
              enablePan={true}
              maxPolarAngle={Math.PI / 1.7}
              minPolarAngle={Math.PI / 3.5}
            />
          </Canvas>
        </WebGLErrorBoundary>
      )}
    </div>
  );
}
