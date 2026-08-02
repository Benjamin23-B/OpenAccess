'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import HumanoidModel3D from './HumanoidModel3D';

interface SignLanguageCanvasProps {
  textToSign?: string;
  signingSpeed?: number;
  onStatusChange?: (status: string) => void;
}

export default function SignLanguageCanvas({
  textToSign = '',
  signingSpeed = 1.0,
  onStatusChange,
}: SignLanguageCanvasProps) {
  const [isSigning, setIsSigning] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const currentFrameRef = useRef<any>(null); // To store the latest kinematic matrix

  // 1. Establish WebSocket Connection to NLP & Kinematics Engine
  useEffect(() => {
    // Assuming the microservice runs on port 8001 locally
    const ws = new WebSocket('ws://localhost:8001/ws/sign');
    
    ws.onopen = () => {
      console.log('Connected to Kinematics Engine');
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'status') {
        onStatusChange?.(msg.data);
        setIsSigning(msg.data !== 'Idle');
      } else if (msg.type === 'frame') {
        // Store latest frame for the 3D Render Loop
        currentFrameRef.current = msg.data;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from Kinematics Engine');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [onStatusChange]);

  // 2. Stream user input text to the engine
  useEffect(() => {
    if (textToSign && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(textToSign);
    }
  }, [textToSign]);

  return (
    <div
      className="w-full h-full relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-[#0f172a] via-[#090d16] to-[#04070d] shadow-2xl flex items-center justify-center"
      style={{ minHeight: '480px', height: '100%' }}
      aria-label="3D Avatar Viewport Container"
    >
      <Canvas camera={{ position: [0, 0.5, 1.8], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[2, 4, 3]} intensity={1.5} color="#ffffff" castShadow />
        <pointLight position={[-2, 1, 1]} intensity={1.0} color="#00ffff" />
        <pointLight position={[2, -1, 1]} intensity={0.8} color="#ff00ff" />
        
        {/* Pass the matrix frame reference to the Avatar Rig */}
        <HumanoidModel3D
          frameRef={currentFrameRef}
          isSigning={isSigning}
          signingSpeed={signingSpeed}
        />
        
        <OrbitControls
          target={[0, 0.4, 0]}
          enableZoom={true}
          enablePan={true}
          maxPolarAngle={Math.PI / 1.6}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </div>
  );
}
