'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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
      capsuleGeometry: any;
      coneGeometry: any;
      torusGeometry: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      meshBasicMaterial: any;
    }
  }
}

interface SkeletalBody3DProps {
  currentWord?: string;
  isSigning?: boolean;
  signingSpeed?: number;
}

// Joint rotation targets definition interface
interface JointRotations {
  leftShoulder?: [number, number, number];
  leftElbow?: [number, number, number];
  leftWrist?: [number, number, number];
  rightShoulder?: [number, number, number];
  rightElbow?: [number, number, number];
  rightWrist?: [number, number, number];
  head?: [number, number, number];
  spine?: [number, number, number];
  leftFingers?: number;
  rightFingers?: number;
}

// Full ISL/ASL Expanded Signing Gesture & Manual Alphabet Dataset
const GESTURE_TARGETS: Record<string, JointRotations[]> = {
  // Idle Base Pose
  idle: [
    {
      leftShoulder: [0.1, 0, -0.2],
      leftElbow: [0.3, 0, 0],
      leftWrist: [0, 0, 0],
      rightShoulder: [0.1, 0, 0.2],
      rightElbow: [0.3, 0, 0],
      rightWrist: [0, 0, 0],
      head: [0, 0, 0],
      spine: [0, 0, 0],
      leftFingers: 0.1,
      rightFingers: 0.1,
    },
  ],

  // -------------------------------------------------------------
  // MACRO WORDS & PHRASES (ISL / ASL Common Expressions)
  // -------------------------------------------------------------
  hello: [
    {
      leftShoulder: [0.5, 0.3, 0.4],
      leftElbow: [1.2, 0, 0],
      leftWrist: [0, -0.4, 0.4],
      rightShoulder: [0.8, -0.3, -0.5],
      rightElbow: [1.5, 0.2, 0],
      rightWrist: [0.3, 0.6, -0.4],
      head: [0.1, 0.2, 0],
      spine: [0.05, -0.05, 0],
      rightFingers: 0,
    },
    {
      leftShoulder: [0.5, 0.3, 0.4],
      leftElbow: [1.2, 0, 0],
      leftWrist: [0, -0.4, 0.4],
      rightShoulder: [0.9, -0.4, -0.3],
      rightElbow: [1.6, -0.2, 0],
      rightWrist: [0.1, -0.4, -0.6],
      head: [0.1, -0.2, 0],
      spine: [0.05, 0.05, 0],
      rightFingers: 0,
    },
  ],
  hi: [
    {
      rightShoulder: [0.9, -0.4, -0.3],
      rightElbow: [1.6, -0.2, 0],
      rightWrist: [0.1, -0.4, -0.6],
      head: [0.1, -0.1, 0],
      rightFingers: 0,
    },
  ],
  namaste: [
    {
      leftShoulder: [0.7, 0.5, 0.6],
      leftElbow: [1.8, -0.4, 0],
      leftWrist: [0.2, 0.3, 0.5],
      rightShoulder: [0.7, -0.5, -0.6],
      rightElbow: [1.8, 0.4, 0],
      rightWrist: [0.2, -0.3, -0.5],
      head: [0.2, 0, 0],
      spine: [0.1, 0, 0],
      leftFingers: 0,
      rightFingers: 0,
    },
  ],
  welcome: [
    {
      leftShoulder: [0.4, 0.6, 0.5],
      leftElbow: [1.1, 0, 0],
      rightShoulder: [0.4, -0.6, -0.5],
      rightElbow: [1.1, 0, 0],
      head: [0.1, 0, 0],
    },
  ],
  thanks: [
    {
      rightShoulder: [0.9, -0.3, 0.2],
      rightElbow: [1.9, 0, 0],
      rightWrist: [0.2, 0.4, 0],
      head: [0.2, 0, 0],
      rightFingers: 0,
    },
    {
      rightShoulder: [0.4, -0.2, 0.5],
      rightElbow: [0.7, 0, 0],
      rightWrist: [0.5, 0.1, 0],
      head: [0.1, 0, 0],
      rightFingers: 0,
    },
  ],
  thankyou: [
    {
      rightShoulder: [0.9, -0.3, 0.2],
      rightElbow: [1.9, 0, 0],
      rightWrist: [0.2, 0.4, 0],
      head: [0.2, 0, 0],
    },
    {
      rightShoulder: [0.4, -0.2, 0.5],
      rightElbow: [0.7, 0, 0],
      rightWrist: [0.5, 0.1, 0],
      head: [0.1, 0, 0],
    },
  ],
  please: [
    {
      rightShoulder: [0.5, -0.6, 0.2],
      rightElbow: [1.4, 0, 0],
      rightWrist: [0.1, 0.3, 0],
      head: [0.1, 0.1, 0],
      rightFingers: 0.1,
    },
    {
      rightShoulder: [0.6, -0.4, 0.3],
      rightElbow: [1.5, 0, 0],
      rightWrist: [0.1, 0.3, 0],
      head: [0.1, -0.1, 0],
      rightFingers: 0.1,
    },
  ],
  sorry: [
    {
      rightShoulder: [0.5, -0.6, 0.1],
      rightElbow: [1.5, 0, 0],
      rightWrist: [0.2, 0.2, 0],
      head: [0.25, 0, 0.1],
      rightFingers: 0.9,
    },
  ],
  help: [
    {
      leftShoulder: [0.5, 0.3, 0.3],
      leftElbow: [1.2, 0, 0],
      leftWrist: [0, -0.4, 0.4],
      rightShoulder: [0.6, -0.3, -0.2],
      rightElbow: [1.3, 0, 0],
      rightWrist: [0, 0.4, -0.4],
      head: [0.1, 0, 0],
      leftFingers: 0.8,
      rightFingers: 0,
    },
    {
      leftShoulder: [0.8, 0.2, 0.4],
      rightShoulder: [0.9, -0.2, -0.3],
      leftElbow: [1.2, 0, 0],
      rightElbow: [1.3, 0, 0],
      head: [0.15, 0, 0],
      leftFingers: 0.8,
      rightFingers: 0,
    },
  ],
  yes: [
    {
      rightShoulder: [0.6, -0.3, 0.3],
      rightElbow: [1.1, 0, 0],
      rightWrist: [-0.4, 0, 0],
      head: [0.2, 0, 0],
      rightFingers: 0.9,
    },
    {
      rightShoulder: [0.6, -0.3, 0.3],
      rightElbow: [1.1, 0, 0],
      rightWrist: [0.4, 0, 0],
      head: [-0.05, 0, 0],
      rightFingers: 0.9,
    },
  ],
  no: [
    {
      rightShoulder: [0.7, -0.4, 0.4],
      rightElbow: [1.1, 0, 0],
      rightWrist: [0, -0.6, 0],
      head: [0, -0.25, 0],
      rightFingers: 0.2,
    },
    {
      rightShoulder: [0.7, -0.4, 0.4],
      rightElbow: [1.1, 0, 0],
      rightWrist: [0, 0.6, 0],
      head: [0, 0.25, 0],
      rightFingers: 0.2,
    },
  ],
  okay: [
    {
      rightShoulder: [0.6, -0.3, 0.2],
      rightElbow: [1.3, 0, 0],
      rightWrist: [0.2, 0.5, 0],
      head: [0.1, 0, 0],
    },
  ],
  good: [
    {
      rightShoulder: [0.7, -0.2, 0.3],
      rightElbow: [1.5, 0, 0],
      rightWrist: [0.1, 0.3, 0],
      head: [0.1, 0, 0],
    },
  ],
  bad: [
    {
      rightShoulder: [0.5, -0.4, 0.5],
      rightElbow: [1.0, 0, 0],
      rightWrist: [-0.3, 0, 0],
      head: [-0.1, 0, 0],
    },
  ],
  happy: [
    {
      leftShoulder: [0.6, 0.4, 0.4],
      leftElbow: [1.4, 0, 0],
      rightShoulder: [0.6, -0.4, -0.4],
      rightElbow: [1.4, 0, 0],
      head: [0.15, 0, 0],
    },
  ],
  sad: [
    {
      leftShoulder: [0.3, 0.1, 0.1],
      leftElbow: [0.8, 0, 0],
      rightShoulder: [0.3, -0.1, -0.1],
      rightElbow: [0.8, 0, 0],
      head: [-0.2, 0, 0],
      spine: [-0.1, 0, 0],
    },
  ],
  love: [
    {
      leftShoulder: [0.8, 0.6, 0.8],
      leftElbow: [1.8, 0, 0],
      leftWrist: [0.2, 0, 0],
      rightShoulder: [0.8, -0.6, -0.8],
      rightElbow: [1.8, 0, 0],
      rightWrist: [0.2, 0, 0],
      head: [0.1, 0, 0],
      leftFingers: 0.7,
      rightFingers: 0.7,
    },
  ],
  friend: [
    {
      leftShoulder: [0.6, 0.4, 0.5],
      leftElbow: [1.5, 0, 0],
      rightShoulder: [0.6, -0.4, -0.5],
      rightElbow: [1.5, 0, 0],
      head: [0.1, 0, 0],
    },
  ],
  family: [
    {
      leftShoulder: [0.5, 0.5, 0.6],
      leftElbow: [1.3, 0, 0],
      rightShoulder: [0.5, -0.5, -0.6],
      rightElbow: [1.3, 0, 0],
    },
  ],
  what: [
    {
      leftShoulder: [0.4, 0.7, 0.6],
      leftElbow: [1.1, 0, 0],
      rightShoulder: [0.4, -0.7, -0.6],
      rightElbow: [1.1, 0, 0],
      head: [0.1, 0.1, 0],
    },
  ],
  where: [
    {
      rightShoulder: [0.7, -0.3, 0.4],
      rightElbow: [1.4, 0, 0],
      rightWrist: [0, 0.7, 0],
      head: [0.1, 0.2, 0],
    },
  ],
  who: [
    {
      rightShoulder: [0.8, -0.2, 0.2],
      rightElbow: [1.6, 0, 0],
      rightWrist: [0.2, 0, 0],
      head: [0.1, 0, 0],
    },
  ],
  why: [
    {
      rightShoulder: [0.8, -0.3, 0.3],
      rightElbow: [1.5, 0, 0],
      rightWrist: [0.3, 0.2, 0],
      head: [0.15, -0.1, 0],
    },
  ],
  how: [
    {
      leftShoulder: [0.5, 0.4, 0.4],
      leftElbow: [1.4, 0, 0],
      rightShoulder: [0.5, -0.4, -0.4],
      rightElbow: [1.4, 0, 0],
      head: [0.1, 0, 0],
    },
  ],
  when: [
    {
      rightShoulder: [0.7, -0.2, 0.3],
      rightElbow: [1.3, 0, 0],
      rightWrist: [0, 0.5, 0],
    },
  ],
  stop: [
    {
      leftShoulder: [0.6, 0.3, 0.3],
      leftElbow: [1.3, 0, 0],
      rightShoulder: [0.7, -0.4, 0],
      rightElbow: [1.2, 0, 0],
      rightWrist: [-0.5, 0, 0],
    },
  ],
  go: [
    {
      rightShoulder: [0.8, -0.2, 0.3],
      rightElbow: [1.0, 0, 0],
      rightWrist: [0.5, 0, 0],
    },
  ],
  eat: [
    {
      rightShoulder: [0.8, -0.4, 0.2],
      rightElbow: [1.8, 0, 0],
      rightWrist: [0.4, 0.2, 0],
      head: [0.15, 0, 0],
    },
  ],
  water: [
    {
      rightShoulder: [0.8, -0.3, 0.2],
      rightElbow: [1.7, 0, 0],
      rightWrist: [0.2, 0.3, 0],
      head: [0.1, 0, 0],
    },
  ],
  doctor: [
    {
      leftShoulder: [0.5, 0.3, 0.3],
      leftElbow: [1.2, 0, 0],
      rightShoulder: [0.7, -0.4, 0.2],
      rightElbow: [1.6, 0, 0],
      rightWrist: [0.3, 0.2, 0],
    },
  ],
  hospital: [
    {
      rightShoulder: [0.7, -0.3, 0.3],
      rightElbow: [1.4, 0, 0],
      rightWrist: [0.2, 0.4, 0],
    },
  ],
  call: [
    {
      rightShoulder: [0.8, -0.4, 0.3],
      rightElbow: [1.8, 0, 0],
      head: [0.1, 0.1, 0],
    },
  ],
  danger: [
    {
      leftShoulder: [0.7, 0.5, 0.5],
      leftElbow: [1.5, 0, 0],
      rightShoulder: [0.7, -0.5, -0.5],
      rightElbow: [1.5, 0, 0],
      head: [-0.1, 0, 0],
    },
  ],
  safe: [
    {
      leftShoulder: [0.5, 0.3, 0.3],
      leftElbow: [1.2, 0, 0],
      rightShoulder: [0.5, -0.3, -0.3],
      rightElbow: [1.2, 0, 0],
    },
  ],
  today: [
    {
      leftShoulder: [0.4, 0.2, 0.2],
      leftElbow: [1.1, 0, 0],
      rightShoulder: [0.4, -0.2, -0.2],
      rightElbow: [1.1, 0, 0],
    },
  ],
  time: [
    {
      leftShoulder: [0.4, 0.3, 0.3],
      leftElbow: [1.2, 0, 0],
      rightShoulder: [0.7, -0.3, 0.2],
      rightElbow: [1.6, 0, 0],
    },
  ],

  // DIGITS 1-5
  '1': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0, 0.3, 0] }],
  '2': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0, 0.5, 0] }],
  '3': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0, 0.7, 0] }],
  '4': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0.2, 0.7, 0] }],
  '5': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0.4, 0.7, 0] }],

  // -------------------------------------------------------------
  // FULL 26 ALPHABET MANUAL FINGERSPELLING DATASET (A to Z)
  // -------------------------------------------------------------
  a: [{ rightShoulder: [0.6, -0.3, 0.2], rightElbow: [1.2, 0, 0], rightWrist: [0.1, 0.1, 0], rightFingers: 0.9 }],
  b: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.2, 0.2, 0], rightFingers: 0 }],
  c: [{ rightShoulder: [0.6, -0.3, 0.3], rightElbow: [1.2, 0, 0], rightWrist: [0.3, 0.3, 0], rightFingers: 0.4 }],
  d: [{ rightShoulder: [0.7, -0.2, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.1, 0.4, 0], rightFingers: 0.2 }],
  e: [{ rightShoulder: [0.6, -0.3, 0.2], rightElbow: [1.2, 0, 0], rightWrist: [0.2, 0.1, 0], rightFingers: 0.8 }],
  f: [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0.3, 0.2, 0], rightFingers: 0.3 }],
  g: [{ rightShoulder: [0.6, -0.4, 0.4], rightElbow: [1.1, 0, 0], rightWrist: [-0.2, 0.5, 0], rightFingers: 0.5 }],
  h: [{ rightShoulder: [0.6, -0.4, 0.4], rightElbow: [1.1, 0, 0], rightWrist: [-0.1, 0.6, 0], rightFingers: 0.3 }],
  i: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.2, 0.3, 0], rightFingers: 0.7 }],
  j: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.4, 0.6, 0], rightFingers: 0.7 }],
  k: [{ rightShoulder: [0.7, -0.2, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0.1, 0.3, 0], rightFingers: 0.2 }],
  l: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0, 0.2, 0], rightFingers: 0.1 }],
  m: [{ rightShoulder: [0.5, -0.3, 0.2], rightElbow: [1.1, 0, 0], rightWrist: [-0.2, 0.1, 0], rightFingers: 0.9 }],
  n: [{ rightShoulder: [0.5, -0.3, 0.2], rightElbow: [1.1, 0, 0], rightWrist: [-0.1, 0.1, 0], rightFingers: 0.8 }],
  o: [{ rightShoulder: [0.6, -0.3, 0.3], rightElbow: [1.2, 0, 0], rightWrist: [0.2, 0.2, 0], rightFingers: 0.6 }],
  p: [{ rightShoulder: [0.5, -0.4, 0.3], rightElbow: [1.0, 0, 0], rightWrist: [-0.3, 0.3, 0], rightFingers: 0.4 }],
  q: [{ rightShoulder: [0.5, -0.4, 0.3], rightElbow: [0.9, 0, 0], rightWrist: [-0.4, 0.2, 0], rightFingers: 0.6 }],
  r: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.1, 0.2, 0], rightFingers: 0.2 }],
  s: [{ rightShoulder: [0.6, -0.3, 0.2], rightElbow: [1.2, 0, 0], rightWrist: [0, 0.1, 0], rightFingers: 1.0 }],
  t: [{ rightShoulder: [0.6, -0.3, 0.2], rightElbow: [1.2, 0, 0], rightWrist: [0.1, 0.2, 0], rightFingers: 0.85 }],
  u: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.2, 0.2, 0], rightFingers: 0.15 }],
  v: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.2, 0.4, 0], rightFingers: 0.15 }],
  w: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0], rightWrist: [0.3, 0.5, 0], rightFingers: 0.1 }],
  x: [{ rightShoulder: [0.6, -0.3, 0.2], rightElbow: [1.2, 0, 0], rightWrist: [0.1, 0.3, 0], rightFingers: 0.7 }],
  y: [{ rightShoulder: [0.7, -0.4, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0.4, 0.4, 0], rightFingers: 0.5 }],
  z: [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0], rightWrist: [0.5, 0.7, 0], rightFingers: 0.1 }],
};

export default function SkeletalBody3D({
  currentWord = '',
  isSigning = false,
  signingSpeed = 1.0,
}: SkeletalBody3DProps) {
  // Joint Group References for Forward Kinematics (FK)
  const spineGroupRef = useRef<THREE.Group>(null);
  const neckGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);

  const leftShoulderGroupRef = useRef<THREE.Group>(null);
  const leftElbowGroupRef = useRef<THREE.Group>(null);
  const leftWristGroupRef = useRef<THREE.Group>(null);

  const rightShoulderGroupRef = useRef<THREE.Group>(null);
  const rightElbowGroupRef = useRef<THREE.Group>(null);
  const rightWristGroupRef = useRef<THREE.Group>(null);

  // Material Theme
  const boneMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#384358'),
        roughness: 0.35,
        metalness: 0.7,
      }),
    []
  );

  const jointGlowMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#00ffcc'),
        emissive: new THREE.Color('#00cc99'),
        emissiveIntensity: 0.7,
        roughness: 0.2,
      }),
    []
  );

  const headSensorMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#00f0ff'),
        emissive: new THREE.Color('#00a8ff'),
        emissiveIntensity: 0.9,
        roughness: 0.1,
      }),
    []
  );

  const ribMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#222d3d'),
        roughness: 0.5,
        metalness: 0.8,
      }),
    []
  );

  // Animation Loop - Smooth Slerp / Lerp to target joint angles & idle breathing
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const lerpFactor = Math.min(1.0, delta * 8.0 * signingSpeed);

    // Determine current gesture target keyframes
    const wordKey = currentWord.toLowerCase().trim();
    const keyframes = GESTURE_TARGETS[wordKey] || GESTURE_TARGETS.idle;
    const keyframeIndex = Math.floor(time * 2.0 * signingSpeed) % keyframes.length;
    const target = keyframes[keyframeIndex] || GESTURE_TARGETS.idle[0];

    // Idle Breathing Micro Sways
    const breathY = Math.sin(time * 2.0) * 0.015;
    const breathRotX = Math.cos(time * 1.5) * 0.01;

    // Apply Spine
    if (spineGroupRef.current) {
      const targetSpine = target.spine || [0, 0, 0];
      spineGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        spineGroupRef.current.rotation.x,
        targetSpine[0] + breathRotX,
        lerpFactor
      );
      spineGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        spineGroupRef.current.rotation.y,
        targetSpine[1],
        lerpFactor
      );
      spineGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        spineGroupRef.current.rotation.z,
        targetSpine[2],
        lerpFactor
      );
      spineGroupRef.current.position.y = THREE.MathUtils.lerp(
        spineGroupRef.current.position.y,
        0.0 + breathY,
        lerpFactor
      );
    }

    // Apply Head / Neck
    if (headGroupRef.current) {
      const targetHead = target.head || [0, 0, 0];
      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        targetHead[0] + Math.sin(time * 1.8) * 0.02,
        lerpFactor
      );
      headGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.y,
        targetHead[1],
        lerpFactor
      );
      headGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.z,
        targetHead[2],
        lerpFactor
      );
    }

    // Apply Left Arm Joints
    if (leftShoulderGroupRef.current) {
      const targetLS = target.leftShoulder || [0.1, 0, -0.2];
      leftShoulderGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        leftShoulderGroupRef.current.rotation.x,
        targetLS[0],
        lerpFactor
      );
      leftShoulderGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        leftShoulderGroupRef.current.rotation.y,
        targetLS[1],
        lerpFactor
      );
      leftShoulderGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        leftShoulderGroupRef.current.rotation.z,
        targetLS[2],
        lerpFactor
      );
    }

    if (leftElbowGroupRef.current) {
      const targetLE = target.leftElbow || [0.3, 0, 0];
      leftElbowGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        leftElbowGroupRef.current.rotation.x,
        targetLE[0],
        lerpFactor
      );
    }

    if (leftWristGroupRef.current) {
      const targetLW = target.leftWrist || [0, 0, 0];
      leftWristGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        leftWristGroupRef.current.rotation.x,
        targetLW[0],
        lerpFactor
      );
      leftWristGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        leftWristGroupRef.current.rotation.y,
        targetLW[1],
        lerpFactor
      );
      leftWristGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        leftWristGroupRef.current.rotation.z,
        targetLW[2],
        lerpFactor
      );
    }

    // Apply Right Arm Joints
    if (rightShoulderGroupRef.current) {
      const targetRS = target.rightShoulder || [0.1, 0, 0.2];
      rightShoulderGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        rightShoulderGroupRef.current.rotation.x,
        targetRS[0],
        lerpFactor
      );
      rightShoulderGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        rightShoulderGroupRef.current.rotation.y,
        targetRS[1],
        lerpFactor
      );
      rightShoulderGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        rightShoulderGroupRef.current.rotation.z,
        targetRS[2],
        lerpFactor
      );
    }

    if (rightElbowGroupRef.current) {
      const targetRE = target.rightElbow || [0.3, 0, 0];
      rightElbowGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        rightElbowGroupRef.current.rotation.x,
        targetRE[0],
        lerpFactor
      );
    }

    if (rightWristGroupRef.current) {
      const targetRW = target.rightWrist || [0, 0, 0];
      rightWristGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        rightWristGroupRef.current.rotation.x,
        targetRW[0],
        lerpFactor
      );
      rightWristGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        rightWristGroupRef.current.rotation.y,
        targetRW[1],
        lerpFactor
      );
      rightWristGroupRef.current.rotation.z = THREE.MathUtils.lerp(
        rightWristGroupRef.current.rotation.z,
        targetRW[2],
        lerpFactor
      );
    }
  });

  return (
    <group position={[0, -1.25, 0]} scale={1.4}>
      {/* Pelvis & Upper Body Spine Root */}
      <group ref={spineGroupRef} position={[0, 0, 0]}>
        {/* Pelvic Bone Girdle */}
        <mesh position={[0, 0, 0]} material={boneMaterial}>
          <boxGeometry args={[0.26, 0.08, 0.14]} />
        </mesh>
        {/* Hip Joint Spheres (Lower Anchor Points) */}
        <mesh position={[-0.12, -0.04, 0]} material={jointGlowMaterial}>
          <sphereGeometry args={[0.038, 16, 16]} />
        </mesh>
        <mesh position={[0.12, -0.04, 0]} material={jointGlowMaterial}>
          <sphereGeometry args={[0.038, 16, 16]} />
        </mesh>

        {/* Vertebrae Column (Spine) */}
        {[0.06, 0.12, 0.18, 0.24, 0.3, 0.36, 0.42].map((yPos, i) => (
          <group key={`vertebra-${i}`} position={[0, yPos, 0]}>
            <mesh material={boneMaterial}>
              <cylinderGeometry args={[0.028 - i * 0.001, 0.03, 0.045, 12]} />
            </mesh>
            <mesh position={[0, 0.025, 0]} material={jointGlowMaterial}>
              <sphereGeometry args={[0.018, 12, 12]} />
            </mesh>
          </group>
        ))}

        {/* Ribcage Structure */}
        {[0.24, 0.31, 0.38, 0.44].map((yPos, i) => {
          const width = 0.28 - i * 0.02;
          return (
            <group key={`rib-${i}`} position={[0, yPos, 0]}>
              <mesh position={[-width / 2, 0, 0.02]} rotation={[0.2, 0, -0.2]} material={ribMaterial}>
                <torusGeometry args={[width / 2.2, 0.009, 8, 16, Math.PI]} />
              </mesh>
              <mesh position={[width / 2, 0, 0.02]} rotation={[0.2, Math.PI, 0.2]} material={ribMaterial}>
                <torusGeometry args={[width / 2.2, 0.009, 8, 16, Math.PI]} />
              </mesh>
            </group>
          );
        })}

        {/* Sternum Center Plate */}
        <mesh position={[0, 0.35, 0.1]} material={boneMaterial}>
          <boxGeometry args={[0.04, 0.18, 0.015]} />
        </mesh>

        {/* Clavicle Collarbone Bar */}
        <mesh position={[0, 0.49, 0]} material={boneMaterial}>
          <boxGeometry args={[0.34, 0.03, 0.04]} />
        </mesh>

        {/* LEFT ARM TREE */}
        <group position={[-0.19, 0.49, 0]}>
          {/* Left Shoulder Joint Sphere */}
          <mesh material={jointGlowMaterial}>
            <sphereGeometry args={[0.045, 16, 16]} />
          </mesh>

          <group ref={leftShoulderGroupRef}>
            {/* Left Upper Arm (Humerus) */}
            <mesh position={[-0.01, -0.15, 0]} material={boneMaterial}>
              <cylinderGeometry args={[0.02, 0.018, 0.26, 12]} />
            </mesh>

            {/* Left Elbow Joint */}
            <group position={[-0.01, -0.29, 0]}>
              <mesh material={jointGlowMaterial}>
                <sphereGeometry args={[0.038, 16, 16]} />
              </mesh>

              <group ref={leftElbowGroupRef}>
                {/* Left Forearm (Radius & Ulna) */}
                <mesh position={[0, -0.14, -0.01]} material={boneMaterial}>
                  <cylinderGeometry args={[0.016, 0.013, 0.25, 12]} />
                </mesh>
                <mesh position={[0, -0.14, 0.01]} material={boneMaterial}>
                  <cylinderGeometry args={[0.014, 0.012, 0.25, 12]} />
                </mesh>

                {/* Left Wrist Joint */}
                <group position={[0, -0.27, 0]}>
                  <mesh material={jointGlowMaterial}>
                    <sphereGeometry args={[0.028, 14, 14]} />
                  </mesh>

                  <group ref={leftWristGroupRef}>
                    {/* Left Hand Palm Plate */}
                    <mesh position={[0, -0.05, 0]} material={boneMaterial}>
                      <boxGeometry args={[0.055, 0.06, 0.018]} />
                    </mesh>

                    {/* 5 Articulated Finger Digits */}
                    {[-0.02, -0.007, 0.007, 0.02].map((xOff, fIdx) => (
                      <group key={`l-finger-${fIdx}`} position={[xOff, -0.08, 0]}>
                        <mesh material={boneMaterial}>
                          <cylinderGeometry args={[0.004, 0.003, 0.045, 8]} />
                        </mesh>
                        <mesh position={[0, -0.025, 0]} material={jointGlowMaterial}>
                          <sphereGeometry args={[0.005, 8, 8]} />
                        </mesh>
                      </group>
                    ))}
                    {/* Thumb */}
                    <group position={[0.025, -0.03, 0.01]} rotation={[0, 0, -0.5]}>
                      <mesh material={boneMaterial}>
                        <cylinderGeometry args={[0.005, 0.004, 0.035, 8]} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* RIGHT ARM TREE */}
        <group position={[0.19, 0.49, 0]}>
          {/* Right Shoulder Joint Sphere */}
          <mesh material={jointGlowMaterial}>
            <sphereGeometry args={[0.045, 16, 16]} />
          </mesh>

          <group ref={rightShoulderGroupRef}>
            {/* Right Upper Arm (Humerus) */}
            <mesh position={[0.01, -0.15, 0]} material={boneMaterial}>
              <cylinderGeometry args={[0.02, 0.018, 0.26, 12]} />
            </mesh>

            {/* Right Elbow Joint */}
            <group position={[0.01, -0.29, 0]}>
              <mesh material={jointGlowMaterial}>
                <sphereGeometry args={[0.038, 16, 16]} />
              </mesh>

              <group ref={rightElbowGroupRef}>
                {/* Right Forearm (Radius & Ulna) */}
                <mesh position={[0, -0.14, -0.01]} material={boneMaterial}>
                  <cylinderGeometry args={[0.016, 0.013, 0.25, 12]} />
                </mesh>
                <mesh position={[0, -0.14, 0.01]} material={boneMaterial}>
                  <cylinderGeometry args={[0.014, 0.012, 0.25, 12]} />
                </mesh>

                {/* Right Wrist Joint */}
                <group position={[0, -0.27, 0]}>
                  <mesh material={jointGlowMaterial}>
                    <sphereGeometry args={[0.028, 14, 14]} />
                  </mesh>

                  <group ref={rightWristGroupRef}>
                    {/* Right Hand Palm Plate */}
                    <mesh position={[0, -0.05, 0]} material={boneMaterial}>
                      <boxGeometry args={[0.055, 0.06, 0.018]} />
                    </mesh>

                    {/* 5 Articulated Finger Digits */}
                    {[-0.02, -0.007, 0.007, 0.02].map((xOff, fIdx) => (
                      <group key={`r-finger-${fIdx}`} position={[xOff, -0.08, 0]}>
                        <mesh material={boneMaterial}>
                          <cylinderGeometry args={[0.004, 0.003, 0.045, 8]} />
                        </mesh>
                        <mesh position={[0, -0.025, 0]} material={jointGlowMaterial}>
                          <sphereGeometry args={[0.005, 8, 8]} />
                        </mesh>
                      </group>
                    ))}
                    {/* Thumb */}
                    <group position={[-0.025, -0.03, 0.01]} rotation={[0, 0, 0.5]}>
                      <mesh material={boneMaterial}>
                        <cylinderGeometry args={[0.005, 0.004, 0.035, 8]} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* NECK & HEAD STRUCTURE */}
        <group ref={neckGroupRef} position={[0, 0.51, 0]}>
          {/* Neck Joint & Vertebrae */}
          <mesh material={jointGlowMaterial}>
            <sphereGeometry args={[0.025, 12, 12]} />
          </mesh>
          <mesh position={[0, 0.05, 0]} material={boneMaterial}>
            <cylinderGeometry args={[0.02, 0.022, 0.08, 12]} />
          </mesh>

          {/* Cranium Head Mesh */}
          <group ref={headGroupRef} position={[0, 0.16, 0]}>
            {/* Base Skull Box/Dome */}
            <mesh material={boneMaterial}>
              <sphereGeometry args={[0.1, 24, 24]} />
            </mesh>
            {/* Cyber Visor Eye Sensor */}
            <mesh position={[0, 0.02, 0.085]} material={headSensorMaterial}>
              <boxGeometry args={[0.13, 0.035, 0.02]} />
            </mesh>

            {/* Jaw / Mandible structure */}
            <mesh position={[0, -0.06, 0.02]} material={boneMaterial}>
              <boxGeometry args={[0.08, 0.04, 0.07]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
