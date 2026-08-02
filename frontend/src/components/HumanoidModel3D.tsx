'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Intrinsic elements for Next.js / React 19 environment
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      sphereGeometry: any;
      cylinderGeometry: any;
      boxGeometry: any;
      capsuleGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
    }
  }
}

interface HumanoidModel3DProps {
  frameRef?: React.MutableRefObject<any>;
  isSigning?: boolean;
  signingSpeed?: number;
}

export default function HumanoidModel3D({
  frameRef,
  isSigning = false,
  signingSpeed = 1.0,
}: HumanoidModel3DProps) {
  // Main Joint References
  const rightShoulderRef = useRef<THREE.Group>(null);
  const rightElbowRef = useRef<THREE.Group>(null);
  const leftShoulderRef = useRef<THREE.Group>(null);
  const leftElbowRef = useRef<THREE.Group>(null);

  // Finger References
  const rightFingersRef = useRef<Array<THREE.Group | null>>([]);
  const leftFingersRef = useRef<Array<THREE.Group | null>>([]);

  // Materials
  const skinMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f1c27d', roughness: 0.4, metalness: 0.1
  }), []);
  
  const shirtMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#0f172a', roughness: 0.8
  }), []);

  // Animation loop that applies exactly what the kinematics engine computed
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const breathY = Math.sin(time * 2.0) * 0.01;
    
    // Default pose limits
    const lerpFactor = Math.min(1.0, delta * 15.0); // Fast lerp to the exact target quaternion

    if (rightShoulderRef.current) rightShoulderRef.current.position.y = 0.45 + breathY;
    if (leftShoulderRef.current) leftShoulderRef.current.position.y = 0.45 + breathY;

    // Apply Quaternions directly from the backend frame
    if (frameRef && frameRef.current) {
      const f = frameRef.current;
      const targetQuat = new THREE.Quaternion();

      if (rightShoulderRef.current && f.rightShoulder) {
        targetQuat.fromArray(f.rightShoulder);
        rightShoulderRef.current.quaternion.slerp(targetQuat, lerpFactor);
      }
      if (rightElbowRef.current && f.rightElbow) {
        targetQuat.fromArray(f.rightElbow);
        rightElbowRef.current.quaternion.slerp(targetQuat, lerpFactor);
      }
      if (leftShoulderRef.current && f.leftShoulder) {
        targetQuat.fromArray(f.leftShoulder);
        leftShoulderRef.current.quaternion.slerp(targetQuat, lerpFactor);
      }
      if (leftElbowRef.current && f.leftElbow) {
        targetQuat.fromArray(f.leftElbow);
        leftElbowRef.current.quaternion.slerp(targetQuat, lerpFactor);
      }
      
      // Fingers (simplistic 1D mapping to Quaternions)
      if (f.fingers) {
        targetQuat.fromArray(f.fingers);
        // We only use the X rotation for curl
        const euler = new THREE.Euler().setFromQuaternion(targetQuat, 'XYZ');
        [...rightFingersRef.current, ...leftFingersRef.current].forEach(finger => {
          if (finger) finger.rotation.x = THREE.MathUtils.lerp(finger.rotation.x, euler.x, lerpFactor);
        });
      }
    } else {
      // Default Idle fallback if no frames received yet
      if (rightShoulderRef.current) rightShoulderRef.current.rotation.x = THREE.MathUtils.lerp(rightShoulderRef.current.rotation.x, 0.2, lerpFactor);
      if (leftShoulderRef.current) leftShoulderRef.current.rotation.x = THREE.MathUtils.lerp(leftShoulderRef.current.rotation.x, 0.2, lerpFactor);
    }
  });

  // Human-like Finger Anatomy Specifications
  const FINGER_SPECS = [
    { name: 'thumb', xOffset: 0.03, yOffset: -0.015, zOffset: 0.015, length: 0.045, radius: 0.007, rotZ: 0.5 },
    { name: 'index', xOffset: 0.022, yOffset: -0.07, zOffset: 0, length: 0.055, radius: 0.006, rotZ: 0 },
    { name: 'middle', xOffset: 0.007, yOffset: -0.075, zOffset: 0, length: 0.065, radius: 0.0065, rotZ: 0 },
    { name: 'ring', xOffset: -0.008, yOffset: -0.07, zOffset: 0, length: 0.058, radius: 0.006, rotZ: 0 },
    { name: 'pinky', xOffset: -0.022, yOffset: -0.06, zOffset: 0, length: 0.045, radius: 0.0055, rotZ: 0 },
  ];

  return (
    <group position={[0, -0.4, 0]} scale={1.2}>
      
      {/* --- TORSO & BODY --- */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.25, 0]} material={shirtMaterial}>
          <cylinderGeometry args={[0.2, 0.18, 0.4, 32]} />
        </mesh>
        
        <mesh position={[0, 0.5, 0]} material={skinMaterial}>
          <cylinderGeometry args={[0.06, 0.07, 0.1, 16]} />
        </mesh>
        
        <group position={[0, 0.65, 0]}>
          <mesh material={skinMaterial}>
            <sphereGeometry args={[0.15, 32, 32]} />
          </mesh>
          <mesh position={[-0.05, 0.02, 0.13]} material={new THREE.MeshBasicMaterial({color: 'white'})}>
            <sphereGeometry args={[0.02, 16, 16]} />
          </mesh>
          <mesh position={[-0.05, 0.02, 0.14]} material={new THREE.MeshBasicMaterial({color: 'black'})}>
            <sphereGeometry args={[0.01, 16, 16]} />
          </mesh>
          <mesh position={[0.05, 0.02, 0.13]} material={new THREE.MeshBasicMaterial({color: 'white'})}>
            <sphereGeometry args={[0.02, 16, 16]} />
          </mesh>
          <mesh position={[0.05, 0.02, 0.14]} material={new THREE.MeshBasicMaterial({color: 'black'})}>
            <sphereGeometry args={[0.01, 16, 16]} />
          </mesh>
        </group>
      </group>

      {/* --- RIGHT ARM & HAND --- */}
      <group ref={rightShoulderRef} position={[0.24, 0.45, 0]}>
        <mesh material={shirtMaterial}>
          <sphereGeometry args={[0.07, 16, 16]} />
        </mesh>
        <mesh position={[0, -0.15, 0]} material={shirtMaterial}>
          <cylinderGeometry args={[0.05, 0.04, 0.3, 16]} />
        </mesh>
        
        <group ref={rightElbowRef} position={[0, -0.3, 0]}>
          <mesh material={skinMaterial}>
            <sphereGeometry args={[0.04, 16, 16]} />
          </mesh>
          <mesh position={[0, -0.15, 0]} material={skinMaterial}>
            <cylinderGeometry args={[0.04, 0.035, 0.3, 16]} />
          </mesh>
          
          <group position={[0, -0.32, 0]}>
            <mesh position={[0, -0.035, 0]} material={skinMaterial}>
              <boxGeometry args={[0.06, 0.07, 0.02]} />
            </mesh>
            
            {FINGER_SPECS.map((spec, i) => (
              <group 
                key={`r-finger-${i}`} 
                position={[-spec.xOffset, spec.yOffset, spec.zOffset]}
                rotation={[0, 0, -spec.rotZ]}
                ref={(el: THREE.Group | null) => { if (el) rightFingersRef.current[i] = el; }}
              >
                <mesh position={[0, -spec.length / 2, 0]} material={skinMaterial}>
                  <capsuleGeometry args={[spec.radius, spec.length, 4, 8]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>

      {/* --- LEFT ARM & HAND --- */}
      <group ref={leftShoulderRef} position={[-0.24, 0.45, 0]}>
        <mesh material={shirtMaterial}>
          <sphereGeometry args={[0.07, 16, 16]} />
        </mesh>
        <mesh position={[0, -0.15, 0]} material={shirtMaterial}>
          <cylinderGeometry args={[0.05, 0.04, 0.3, 16]} />
        </mesh>
        
        <group ref={leftElbowRef} position={[0, -0.3, 0]}>
          <mesh material={skinMaterial}>
            <sphereGeometry args={[0.04, 16, 16]} />
          </mesh>
          <mesh position={[0, -0.15, 0]} material={skinMaterial}>
            <cylinderGeometry args={[0.04, 0.035, 0.3, 16]} />
          </mesh>
          
          <group position={[0, -0.32, 0]}>
            <mesh position={[0, -0.035, 0]} material={skinMaterial}>
              <boxGeometry args={[0.06, 0.07, 0.02]} />
            </mesh>
            
            {FINGER_SPECS.map((spec, i) => (
              <group 
                key={`l-finger-${i}`} 
                position={[spec.xOffset, spec.yOffset, spec.zOffset]}
                rotation={[0, 0, spec.rotZ]}
                ref={(el: THREE.Group | null) => { if (el) leftFingersRef.current[i] = el; }}
              >
                <mesh position={[0, -spec.length / 2, 0]} material={skinMaterial}>
                  <capsuleGeometry args={[spec.radius, spec.length, 4, 8]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>

    </group>
  );
}
