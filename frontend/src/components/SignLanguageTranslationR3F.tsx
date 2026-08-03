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
    'teacher', 'toilet', 'food', 'home',
    '1', '2', '3', '4', '5'
  ]);

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

  const handleResetCamera = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  };

  return (
    <div
      className="w-full h-full relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04070d] shadow-2xl flex items-center justify-center"
      style={{ minHeight: '480px', height: '100%' }}
      aria-label="3D Avatar Viewport Container"
    >
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
    </div>
  );
}
