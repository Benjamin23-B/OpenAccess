import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import Avatar from './Avatar.tsx';

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight 
        position={[2.5, 4, 3]} 
        intensity={1.2} 
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0001}
        shadow-radius={4}
      />
      <directionalLight 
        position={[-2.5, 2, 3]} 
        intensity={0.6} 
        color="#e3f2ff"
      />
      <directionalLight 
        position={[-3, 4, -4]} 
        intensity={2.0} 
        color="#ffffff" 
      />
    </>
  );
}

export default function Scene({ 
  gestureState, 
  breathingSpeed, 
  autoBlink,
  leftHandLandmarks,
  rightHandLandmarks
}) {
  return (
    <Canvas
      camera={{ position: [0, 0.28, 1.25], fov: 38 }}
      shadows
      gl={{ 
        antialias: true, 
        toneMapping: THREE.ACESFilmicToneMapping, 
        toneMappingExposure: 1.05,
        shadowMapType: THREE.PCFSoftShadowMap
      }}
      className="w-full h-full"
    >
      <color attach="background" args={['#0c101c']} />
      <Environment preset="studio" intensity={0.4} />
      <SceneLighting />
      
      <Suspense fallback={null}>
        <Avatar 
          gestureState={gestureState} 
          breathingSpeed={breathingSpeed} 
          autoBlink={autoBlink} 
          leftHandLandmarks={leftHandLandmarks}
          rightHandLandmarks={rightHandLandmarks}
        />
      </Suspense>

      <EffectComposer>
        <Bloom 
          luminanceThreshold={0.8} 
          luminanceSmoothing={0.1} 
          height={300} 
          intensity={0.2} 
        />
      </EffectComposer>

      <OrbitControls 
        enableZoom={true} 
        minDistance={0.7}
        maxDistance={2.5}
        target={[0, 0.1, 0]} 
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 3}
      />
    </Canvas>
  );
}
