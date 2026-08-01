'use client';

import React, { useState, useEffect, useRef } from 'react';

interface SignLanguage2DAvatarProps {
  textToSign?: string;
  signingSpeed?: number;
  onStatusChange?: (status: string) => void;
}

// 2D Joint Angles & Offsets for ISL Gestures (Degrees)
interface Joint2DAngles {
  rightArmAngle?: number;
  rightElbowAngle?: number;
  rightWristY?: number;
  rightWristX?: number;
  leftArmAngle?: number;
  leftElbowAngle?: number;
  headTilt?: number;
}

const GESTURE_2D_KEYFRAMES: Record<string, Joint2DAngles[]> = {
  idle: [
    // Matching reference: right arm raised horizontal across chest, left arm natural
    { rightArmAngle: -65, rightElbowAngle: -95, rightWristY: -50, rightWristX: -15, leftArmAngle: 12, leftElbowAngle: 15, headTilt: 0 }
  ],
  hello: [
    // Raised hand across chin/chest like in reference image
    { rightArmAngle: -68, rightElbowAngle: -105, rightWristY: -65, rightWristX: -20, headTilt: 3 },
    { rightArmAngle: -60, rightElbowAngle: -115, rightWristY: -60, rightWristX: -30, headTilt: -3 }
  ],
  hi: [
    { rightArmAngle: -68, rightElbowAngle: -105, rightWristY: -65, rightWristX: -20, headTilt: 3 }
  ],
  namaste: [
    { rightArmAngle: -60, rightElbowAngle: -90, leftArmAngle: 60, leftElbowAngle: 90, headTilt: 6 }
  ],
  thanks: [
    { rightArmAngle: -75, rightElbowAngle: -110, rightWristY: -70, headTilt: 4 },
    { rightArmAngle: -35, rightElbowAngle: -45, rightWristY: -10, headTilt: 0 }
  ],
  thankyou: [
    { rightArmAngle: -75, rightElbowAngle: -110, rightWristY: -70, headTilt: 4 },
    { rightArmAngle: -35, rightElbowAngle: -45, rightWristY: -10, headTilt: 0 }
  ],
  please: [
    { rightArmAngle: -45, rightElbowAngle: -75, rightWristY: -35, headTilt: 3 }
  ],
  help: [
    { rightArmAngle: -55, rightElbowAngle: -80, leftArmAngle: 55, leftElbowAngle: 80, headTilt: 4 }
  ],
  teacher: [
    { rightArmAngle: -70, rightElbowAngle: -110, leftArmAngle: 70, leftElbowAngle: 110 },
    { rightArmAngle: -35, rightElbowAngle: -45, leftArmAngle: 35, leftElbowAngle: 45 }
  ],
  toilet: [
    { rightArmAngle: -45, rightElbowAngle: -75, rightWristY: -35, headTilt: 0 },
    { rightArmAngle: -45, rightElbowAngle: -70, rightWristY: -35, headTilt: 0 }
  ],
  food: [
    { rightArmAngle: -75, rightElbowAngle: -120, rightWristY: -75, headTilt: 4 },
    { rightArmAngle: -70, rightElbowAngle: -105, rightWristY: -65, headTilt: 2 }
  ],
  home: [
    { rightArmAngle: -55, rightElbowAngle: -85, leftArmAngle: 55, leftElbowAngle: 85, headTilt: 2 }
  ],
  yes: [
    { rightArmAngle: -50, rightElbowAngle: -75, headTilt: 10 },
    { rightArmAngle: -50, rightElbowAngle: -75, headTilt: -3 }
  ],
  no: [
    { rightArmAngle: -55, rightElbowAngle: -70, headTilt: -8 },
    { rightArmAngle: -55, rightElbowAngle: -70, headTilt: 8 }
  ],
  sorry: [
    { rightArmAngle: -40, rightElbowAngle: -80, headTilt: 8 }
  ],
  love: [
    { rightArmAngle: -70, rightElbowAngle: -100, leftArmAngle: 70, leftElbowAngle: 100, headTilt: 4 }
  ],
  happy: [
    { rightArmAngle: -55, rightElbowAngle: -65, leftArmAngle: 55, leftElbowAngle: 65, headTilt: 6 }
  ]
};

export default function SignLanguage2DAvatar({
  textToSign = '',
  signingSpeed = 1.0,
  onStatusChange,
}: SignLanguage2DAvatarProps) {
  const [isSigning, setIsSigning] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [keyframe, setKeyframe] = useState<Joint2DAngles>(GESTURE_2D_KEYFRAMES.idle[0]);

  const queueRef = useRef<string[]>([]);
  const timeoutRef = useRef<any>(null);

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
      setKeyframe(GESTURE_2D_KEYFRAMES.idle[0]);
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

    const wordKey = nextToken.toLowerCase().trim();
    const frames = GESTURE_2D_KEYFRAMES[wordKey] || GESTURE_2D_KEYFRAMES.hello;
    setKeyframe(frames[0] || GESTURE_2D_KEYFRAMES.idle[0]);

    const duration = (nextToken.length === 1 ? 800 : 1200) / signingSpeed;
    timeoutRef.current = setTimeout(() => {
      if (frames.length > 1) {
        setKeyframe(frames[1]);
      }
      setTimeout(() => {
        processNextWord();
      }, duration / 2);
    }, duration / 2);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const lArm = keyframe.leftArmAngle ?? 12;
  const lElbow = keyframe.leftElbowAngle ?? 15;
  const rArm = keyframe.rightArmAngle ?? -65;
  const rElbow = keyframe.rightElbowAngle ?? -95;
  const hTilt = keyframe.headTilt ?? 0;

  return (
    <div
      className="w-full h-full relative overflow-hidden rounded-2xl border border-slate-700/60 bg-[#121214] shadow-2xl flex flex-col items-center justify-between p-4"
      style={{ minHeight: '480px', height: '100%' }}
      aria-label="Sign Language Translation Viewport"
    >
      {/* Central Pixar-Style Avatar Graphic with Skeletal Overlay */}
      <div className="w-full flex-1 flex items-center justify-center relative my-2">
        <svg
          viewBox="0 0 400 420"
          className="w-full max-w-[400px] max-h-[400px] transition-all duration-300"
        >
          <defs>
            {/* Skin Gradient (Warm Tone like reference) */}
            <linearGradient id="skinGradRef" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f4cbb5" />
              <stop offset="100%" stopColor="#e39f82" />
            </linearGradient>

            {/* Blue Sweater Gradient */}
            <linearGradient id="sweaterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3d68a4" />
              <stop offset="100%" stopColor="#2a4775" />
            </linearGradient>

            {/* Curly Dark Brown Hair Texture Color */}
            <linearGradient id="curlyHairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a3225" />
              <stop offset="100%" stopColor="#241710" />
            </linearGradient>

            {/* Neon Green Telemetry Glow */}
            <filter id="neonGreenGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 1. TORSO — Rounded Pixar-style blue sweater like reference */}
          <path
            d="M 125,370 C 118,290 132,230 158,218 L 242,218 C 268,230 282,290 275,370 Z"
            fill="url(#sweaterGrad)"
            stroke="#1d3254"
            strokeWidth="2"
          />

          {/* Sweater center zipper seam (visible like reference) */}
          <line x1="200" y1="228" x2="200" y2="370" stroke="#2a4775" strokeWidth="2.5" opacity="0.6" />
          {/* Zipper teeth detail */}
          <line x1="198" y1="235" x2="202" y2="235" stroke="#4a6a9a" strokeWidth="1" opacity="0.4" />
          <line x1="198" y1="255" x2="202" y2="255" stroke="#4a6a9a" strokeWidth="1" opacity="0.4" />
          <line x1="198" y1="275" x2="202" y2="275" stroke="#4a6a9a" strokeWidth="1" opacity="0.4" />
          <line x1="198" y1="295" x2="202" y2="295" stroke="#4a6a9a" strokeWidth="1" opacity="0.4" />
          <line x1="198" y1="315" x2="202" y2="315" stroke="#4a6a9a" strokeWidth="1" opacity="0.4" />
          <line x1="198" y1="335" x2="202" y2="335" stroke="#4a6a9a" strokeWidth="1" opacity="0.4" />

          {/* Rounded shoulder caps */}
          <ellipse cx="148" cy="222" rx="30" ry="16" fill="url(#sweaterGrad)" stroke="#1d3254" strokeWidth="1.5" />
          <ellipse cx="252" cy="222" rx="30" ry="16" fill="url(#sweaterGrad)" stroke="#1d3254" strokeWidth="1.5" />

          {/* Crew-Neck Collar — Round neckline */}
          <path
            d="M 172,218 Q 200,234 228,218"
            fill="none"
            stroke="#233a60"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M 174,219 Q 200,232 226,219"
            fill="none"
            stroke="#2a4e7a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* 2. NECK — Softer, wider Pixar neck */}
          <rect x="178" y="170" width="44" height="52" rx="14" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1.5" />

          {/* 3. HEAD GROUP — Pixar-style matching reference image */}
          <g transform={`rotate(${hTilt}, 200, 115)`} className="transition-transform duration-300">

            {/* Layer 0: Outermost voluminous curly hair halo (widest silhouette) */}
            <g fill="#1e120a">
              <circle cx="200" cy="55" r="30" />
              <circle cx="142" cy="72" r="25" />
              <circle cx="258" cy="72" r="25" />
              <circle cx="128" cy="100" r="22" />
              <circle cx="272" cy="100" r="22" />
              <circle cx="132" cy="128" r="18" />
              <circle cx="268" cy="128" r="18" />
            </g>

            {/* Layer 1: Dense curly back dome tufts */}
            <g fill="url(#curlyHairGrad)">
              <circle cx="155" cy="60" r="24" />
              <circle cx="180" cy="50" r="26" />
              <circle cx="200" cy="46" r="28" />
              <circle cx="220" cy="50" r="26" />
              <circle cx="245" cy="60" r="24" />
              <circle cx="135" cy="85" r="22" />
              <circle cx="265" cy="85" r="22" />
              <circle cx="130" cy="110" r="19" />
              <circle cx="270" cy="110" r="19" />
            </g>

            {/* Ears (partially behind hair) */}
            <ellipse cx="140" cy="122" rx="10" ry="12" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1.5" />
            <ellipse cx="260" cy="122" rx="10" ry="12" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1.5" />

            {/* Face — Rounder, softer Pixar proportions */}
            <ellipse cx="200" cy="125" rx="56" ry="62" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="2" />

            {/* Layer 2: Front curly bangs covering forehead (main curl row) */}
            <g fill="#28170f">
              <circle cx="148" cy="72" r="20" />
              <circle cx="172" cy="62" r="21" />
              <circle cx="200" cy="58" r="23" />
              <circle cx="228" cy="62" r="21" />
              <circle cx="252" cy="72" r="20" />
            </g>

            {/* Layer 3: Foreground wispy curls overlapping forehead edge */}
            <g fill="#1e120a">
              <circle cx="158" cy="82" r="15" />
              <circle cx="178" cy="76" r="16" />
              <circle cx="200" cy="73" r="17" />
              <circle cx="222" cy="76" r="16" />
              <circle cx="242" cy="82" r="15" />
            </g>

            {/* Subtle curl texture highlights */}
            <g fill="#3d2517" opacity="0.45">
              <circle cx="168" cy="65" r="8" />
              <circle cx="195" cy="57" r="9" />
              <circle cx="230" cy="65" r="8" />
            </g>

            {/* Eyes — Big, round Pixar/Disney style */}
            <ellipse cx="176" cy="116" rx="14" ry="16" fill="#ffffff" />
            <ellipse cx="224" cy="116" rx="14" ry="16" fill="#ffffff" />

            {/* Iris (rich brown) */}
            <circle cx="178" cy="118" r="9" fill="#5c3317" />
            <circle cx="222" cy="118" r="9" fill="#5c3317" />

            {/* Pupils */}
            <circle cx="179" cy="118" r="5" fill="#0a0604" />
            <circle cx="221" cy="118" r="5" fill="#0a0604" />

            {/* Eye shine specular highlights */}
            <circle cx="182" cy="114" r="2.5" fill="#ffffff" />
            <circle cx="224" cy="114" r="2.5" fill="#ffffff" />
            <circle cx="176" cy="121" r="1.2" fill="#ffffff" opacity="0.6" />
            <circle cx="220" cy="121" r="1.2" fill="#ffffff" opacity="0.6" />

            {/* Upper eyelid creases */}
            <path d="M 162,104 Q 176,98 190,104" stroke="#5c3317" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
            <path d="M 210,104 Q 224,98 238,104" stroke="#5c3317" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />

            {/* Eyebrows — Thicker, natural arch */}
            <path d="M 160,95 Q 176,86 192,95" stroke="#28170f" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M 208,95 Q 224,86 240,95" stroke="#28170f" strokeWidth="5" fill="none" strokeLinecap="round" />

            {/* Nose — Small, soft bump */}
            <path d="M 200,120 Q 195,134 198,137 Q 200,139 202,137 Q 205,134 200,120 Z" fill="#d9896b" />
            <circle cx="196" cy="136" r="2.5" fill="#d9896b" />
            <circle cx="204" cy="136" r="2.5" fill="#d9896b" />

            {/* Cheek blush */}
            <circle cx="162" cy="136" r="12" fill="#f4a89a" opacity="0.25" />
            <circle cx="238" cy="136" r="12" fill="#f4a89a" opacity="0.25" />

            {/* Mouth — Warm gentle smile with upper lip detail */}
            <path d="M 184,150 Q 192,156 200,152 Q 208,156 216,150" stroke="#c0524a" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M 188,150 Q 200,160 212,150" stroke="#b94e40" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.5" />
          </g>

          {/* 4. LEFT ARM — Hangs naturally at side like reference */}
          <g className="transition-transform duration-300" style={{ transformOrigin: '140px 225px', transform: `rotate(${lArm}deg)` }}>
            {/* Upper Arm (sweater sleeve — rounded) */}
            <path d="M 118,218 Q 105,250 110,295 Q 125,310 140,295 Q 148,250 142,218 Z" fill="url(#sweaterGrad)" stroke="#1d3254" strokeWidth="1.5" />
            {/* Forearm & Hand */}
            <g className="transition-transform duration-300" style={{ transformOrigin: '125px 295px', transform: `rotate(${lElbow}deg)` }}>
              <path d="M 113,290 Q 108,330 115,370 Q 125,380 135,370 Q 140,330 137,290 Z" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1.5" />
              {/* Hand palm */}
              <ellipse cx="125" cy="375" rx="15" ry="12" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1.5" />
              {/* Fingers together (relaxed) */}
              <rect x="111" y="382" width="5.5" height="16" rx="2.8" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              <rect x="118" y="384" width="6" height="20" rx="3" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              <rect x="125" y="385" width="6" height="22" rx="3" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              <rect x="132" y="384" width="6" height="19" rx="3" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              {/* Thumb */}
              <rect x="139" y="377" width="5.5" height="14" rx="2.8" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" transform="rotate(15, 142, 377)" />
            </g>
          </g>

          {/* 5. RIGHT ARM — Raised horizontal across chest, flat palm-down hand like reference */}
          <g className="transition-transform duration-300" style={{ transformOrigin: '260px 225px', transform: `rotate(${rArm}deg)` }}>
            {/* Upper Arm (sweater sleeve — rounded) */}
            <path d="M 258,218 Q 270,250 268,295 Q 255,310 240,295 Q 235,250 238,218 Z" fill="url(#sweaterGrad)" stroke="#1d3254" strokeWidth="1.5" />
            {/* Forearm & Hand */}
            <g className="transition-transform duration-300" style={{ transformOrigin: '255px 295px', transform: `rotate(${rElbow}deg)` }}>
              <path d="M 243,290 Q 238,330 242,365 Q 252,378 265,365 Q 270,330 267,290 Z" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1.5" />
              {/* Hand palm — flat horizontal, palm-down like reference */}
              <ellipse cx="255" cy="372" rx="22" ry="10" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1.5" />
              {/* Fingers together (flat palm-down gesture) */}
              <rect x="242" y="378" width="6.5" height="20" rx="3.2" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              <rect x="250" y="379" width="7" height="22" rx="3.5" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              <rect x="258" y="378" width="6.5" height="20" rx="3.2" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              <rect x="266" y="376" width="6" height="16" rx="3" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" />
              {/* Thumb tucked under */}
              <ellipse cx="237" cy="370" rx="5" ry="7" fill="url(#skinGradRef)" stroke="#cb8265" strokeWidth="1" transform="rotate(-20, 237, 370)" />
            </g>
          </g>

          {/* 6. NEON GREEN SKELETAL TELEMETRY OVERLAY — translucent like reference */}
          <g filter="url(#neonGreenGlow)" opacity="0.55">
            {/* Spine Center */}
            <line x1="200" y1="224" x2="200" y2="365" stroke="#4ade80" strokeWidth="2" />
            <circle cx="200" cy="224" r="3.5" fill="#22c55e" />
            <circle cx="200" cy="290" r="3" fill="#22c55e" />
            <circle cx="200" cy="365" r="3" fill="#22c55e" />

            {/* Collarbone / Shoulder Line */}
            <line x1="140" y1="225" x2="260" y2="225" stroke="#4ade80" strokeWidth="2" />
            <circle cx="140" cy="225" r="4" fill="#4ade80" />
            <circle cx="260" cy="225" r="4" fill="#4ade80" />

            {/* Left Arm Skeleton */}
            <g className="transition-transform duration-300" style={{ transformOrigin: '140px 225px', transform: `rotate(${lArm}deg)` }}>
              <line x1="135" y1="225" x2="125" y2="300" stroke="#4ade80" strokeWidth="2" />
              <circle cx="125" cy="300" r="4" fill="#4ade80" />
              <g className="transition-transform duration-300" style={{ transformOrigin: '125px 295px', transform: `rotate(${lElbow}deg)` }}>
                <line x1="125" y1="300" x2="125" y2="375" stroke="#4ade80" strokeWidth="2" />
                <circle cx="125" cy="375" r="3.5" fill="#4ade80" />
                {/* Finger telemetry */}
                <line x1="125" y1="375" x2="112" y2="392" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="125" y1="375" x2="119" y2="397" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="125" y1="375" x2="127" y2="400" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="125" y1="375" x2="134" y2="397" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="125" y1="375" x2="140" y2="389" stroke="#4ade80" strokeWidth="1.5" />
                <circle cx="112" cy="392" r="2" fill="#86efac" />
                <circle cx="119" cy="397" r="2" fill="#86efac" />
                <circle cx="127" cy="400" r="2" fill="#86efac" />
                <circle cx="134" cy="397" r="2" fill="#86efac" />
                <circle cx="140" cy="389" r="2" fill="#86efac" />
              </g>
            </g>

            {/* Right Arm Skeleton (Active signing hand) */}
            <g className="transition-transform duration-300" style={{ transformOrigin: '260px 225px', transform: `rotate(${rArm}deg)` }}>
              <line x1="260" y1="225" x2="255" y2="300" stroke="#4ade80" strokeWidth="2" />
              <circle cx="255" cy="300" r="4.5" fill="#4ade80" />
              <g className="transition-transform duration-300" style={{ transformOrigin: '255px 295px', transform: `rotate(${rElbow}deg)` }}>
                <line x1="255" y1="300" x2="255" y2="372" stroke="#4ade80" strokeWidth="2" />
                <circle cx="255" cy="372" r="4" fill="#4ade80" />
                {/* Finger telemetry */}
                <line x1="255" y1="372" x2="236" y2="388" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="255" y1="372" x2="244" y2="394" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="255" y1="372" x2="253" y2="398" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="255" y1="372" x2="262" y2="394" stroke="#4ade80" strokeWidth="1.5" />
                <line x1="255" y1="372" x2="270" y2="388" stroke="#4ade80" strokeWidth="1.5" />
                <circle cx="236" cy="388" r="2" fill="#86efac" />
                <circle cx="244" cy="394" r="2" fill="#86efac" />
                <circle cx="253" cy="398" r="2" fill="#86efac" />
                <circle cx="262" cy="394" r="2" fill="#86efac" />
                <circle cx="270" cy="388" r="2" fill="#86efac" />
              </g>
            </g>
          </g>
        </svg>
      </div>

      {/* Caption Labels matching reference image */}
      <div className="w-full flex flex-col items-center justify-center pt-2 pb-1 text-center">
        <h3 className="text-lg font-bold text-slate-100 tracking-wide">
          Sign Language Translation
        </h3>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Webcam gesture recognition module
        </p>
      </div>
    </div>
  );
}
