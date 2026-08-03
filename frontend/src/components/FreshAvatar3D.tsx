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
      torusGeometry: any;
      meshStandardMaterial: any;
      meshBasicMaterial: any;
    }
  }
}

interface FreshAvatar3DProps {
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

// Full ISL/ASL Expanded Gesture Dataset for Fresh Humanoid Avatar
const GESTURE_TARGETS: Record<string, JointRotations[]> = {
  idle: [
    {
      leftShoulder: [0.1, 0, -0.15],
      leftElbow: [0.35, 0, 0],
      leftWrist: [0, 0, 0],
      rightShoulder: [0.1, 0, 0.15],
      rightElbow: [0.35, 0, 0],
      rightWrist: [0, 0, 0],
      head: [0, 0, 0],
      spine: [0, 0, 0],
      leftFingers: 0.1,
      rightFingers: 0.1,
    },
  ],
  hello: [
    {
      rightShoulder: [0.8, -0.3, -0.5],
      rightElbow: [1.5, 0.2, 0],
      rightWrist: [0.3, 0.6, -0.4],
      head: [0.1, 0.1, 0],
      rightFingers: 0,
    },
    {
      rightShoulder: [0.9, -0.4, -0.3],
      rightElbow: [1.6, -0.2, 0],
      rightWrist: [0.1, -0.4, -0.6],
      head: [0.1, -0.1, 0],
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
      leftFingers: 0,
      rightFingers: 0,
    },
  ],
  teacher: [
    {
      leftShoulder: [0.8, 0.3, 0.4],
      leftElbow: [1.7, -0.2, 0],
      leftWrist: [0.2, 0.1, 0.2],
      rightShoulder: [0.8, -0.3, -0.4],
      rightElbow: [1.7, 0.2, 0],
      rightWrist: [0.2, -0.1, -0.2],
      leftFingers: 0.3,
      rightFingers: 0.3,
    },
    {
      leftShoulder: [0.8, 0.4, 0.3],
      leftElbow: [1.5, -0.1, 0],
      leftWrist: [0.3, 0.2, 0.1],
      rightShoulder: [0.8, -0.4, -0.3],
      rightElbow: [1.5, 0.1, 0],
      rightWrist: [0.3, -0.2, -0.1],
      leftFingers: 0.3,
      rightFingers: 0.3,
    },
    {
      leftShoulder: [0.4, 0.2, 0.2],
      leftElbow: [0.8, 0, 0],
      leftWrist: [0.1, 0, 0],
      rightShoulder: [0.4, -0.2, -0.2],
      rightElbow: [0.8, 0, 0],
      rightWrist: [0.1, 0, 0],
      leftFingers: 1.0,
      rightFingers: 1.0,
    }
  ],
  toilet: [
    {
      rightShoulder: [0.6, -0.3, 0.2],
      rightElbow: [1.2, 0, 0],
      rightWrist: [0.1, -0.2, 0],
      rightFingers: 0.5,
    },
    {
      rightShoulder: [0.6, -0.3, 0.2],
      rightElbow: [1.2, 0, 0],
      rightWrist: [0.1, 0.2, 0],
      rightFingers: 0.5,
    },
    {
      rightShoulder: [0.6, -0.3, 0.2],
      rightElbow: [1.2, 0, 0],
      rightWrist: [0.1, -0.2, 0],
      rightFingers: 0.5,
    }
  ],
  food: [
    {
      rightShoulder: [0.8, -0.4, 0.2],
      rightElbow: [1.8, 0, 0],
      rightWrist: [0.4, 0.2, 0],
      head: [0.15, 0, 0],
      rightFingers: 0.2,
    },
    {
      rightShoulder: [0.8, -0.4, 0.2],
      rightElbow: [1.6, 0, 0],
      rightWrist: [0.3, 0.2, 0],
      head: [0.1, 0, 0],
      rightFingers: 0.2,
    },
    {
      rightShoulder: [0.8, -0.4, 0.2],
      rightElbow: [1.8, 0, 0],
      rightWrist: [0.4, 0.2, 0],
      head: [0.15, 0, 0],
      rightFingers: 0.2,
    }
  ],
  home: [
    {
      leftShoulder: [0.7, 0.4, 0.5],
      leftElbow: [1.6, -0.3, 0],
      leftWrist: [0.3, 0.3, 0.4],
      rightShoulder: [0.7, -0.4, -0.5],
      rightElbow: [1.6, 0.3, 0],
      rightWrist: [0.3, -0.3, -0.4],
      head: [0.1, 0, 0],
      leftFingers: 1.0,
      rightFingers: 1.0,
    }
  ],
  thanks: [
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
  thankyou: [
    {
      rightShoulder: [0.9, -0.3, 0.2],
      rightElbow: [1.9, 0, 0],
      rightWrist: [0.2, 0.4, 0],
    },
    {
      rightShoulder: [0.4, -0.2, 0.5],
      rightElbow: [0.7, 0, 0],
      rightWrist: [0.5, 0.1, 0],
    },
  ],
  please: [
    {
      rightShoulder: [0.5, -0.6, 0.2],
      rightElbow: [1.4, 0, 0],
      rightWrist: [0.1, 0.3, 0],
      head: [0.1, 0.1, 0],
    },
    {
      rightShoulder: [0.6, -0.4, 0.3],
      rightElbow: [1.5, 0, 0],
      rightWrist: [0.1, 0.3, 0],
      head: [0.1, -0.1, 0],
    },
  ],
  help: [
    {
      leftShoulder: [0.5, 0.3, 0.3],
      leftElbow: [1.2, 0, 0],
      rightShoulder: [0.6, -0.3, -0.2],
      rightElbow: [1.3, 0, 0],
      head: [0.1, 0, 0],
    },
    {
      leftShoulder: [0.8, 0.2, 0.4],
      rightShoulder: [0.9, -0.2, -0.3],
      leftElbow: [1.2, 0, 0],
      rightElbow: [1.3, 0, 0],
    },
  ],
  yes: [
    {
      rightShoulder: [0.6, -0.3, 0.3],
      rightElbow: [1.1, 0, 0],
      rightWrist: [-0.4, 0, 0],
      head: [0.2, 0, 0],
    },
    {
      rightShoulder: [0.6, -0.3, 0.3],
      rightElbow: [1.1, 0, 0],
      rightWrist: [0.4, 0, 0],
      head: [-0.05, 0, 0],
    },
  ],
  no: [
    {
      rightShoulder: [0.7, -0.4, 0.4],
      rightElbow: [1.1, 0, 0],
      rightWrist: [0, -0.6, 0],
      head: [0, -0.25, 0],
    },
    {
      rightShoulder: [0.7, -0.4, 0.4],
      rightElbow: [1.1, 0, 0],
      rightWrist: [0, 0.6, 0],
      head: [0, 0.25, 0],
    },
  ],
  sorry: [
    {
      rightShoulder: [0.5, -0.6, 0.1],
      rightElbow: [1.5, 0, 0],
      rightWrist: [0.2, 0.2, 0],
      head: [0.25, 0, 0.1],
    },
  ],
  love: [
    {
      leftShoulder: [0.8, 0.6, 0.8],
      leftElbow: [1.8, 0, 0],
      rightShoulder: [0.8, -0.6, -0.8],
      rightElbow: [1.8, 0, 0],
      head: [0.1, 0, 0],
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
  doctor: [
    {
      leftShoulder: [0.4, 0.2, 0.3],
      leftElbow: [1.2, 0, 0],
      rightShoulder: [0.8, -0.4, 0.4],
      rightElbow: [1.7, 0.2, 0],
      rightWrist: [0.3, 0.4, -0.2],
    },
    {
      rightShoulder: [0.8, -0.4, 0.4],
      rightElbow: [1.5, 0.2, 0],
      rightWrist: [0.2, 0.3, -0.2],
    },
  ],
  hospital: [
    {
      leftShoulder: [0.7, 0.4, 0.3],
      leftElbow: [1.6, -0.2, 0],
      rightShoulder: [0.7, -0.4, -0.3],
      rightElbow: [1.6, 0.2, 0],
    },
  ],
  what: [
    {
      leftShoulder: [0.4, 0.3, 0.4],
      leftElbow: [1.1, 0, 0],
      rightShoulder: [0.4, -0.3, -0.4],
      rightElbow: [1.1, 0, 0],
      head: [0.1, 0.2, 0],
    },
    {
      leftShoulder: [0.4, 0.3, 0.4],
      leftElbow: [1.1, 0, 0],
      rightShoulder: [0.4, -0.3, -0.4],
      rightElbow: [1.1, 0, 0],
      head: [0.1, -0.2, 0],
    },
  ],
  where: [
    {
      rightShoulder: [0.8, -0.3, 0.2],
      rightElbow: [1.4, 0, 0],
      rightWrist: [0, 0.4, 0],
      head: [0.1, 0.1, 0],
    },
    {
      rightShoulder: [0.8, -0.3, 0.2],
      rightElbow: [1.4, 0, 0],
      rightWrist: [0, -0.4, 0],
      head: [0.1, -0.1, 0],
    },
  ],
  why: [
    {
      rightShoulder: [0.9, -0.3, -0.2],
      rightElbow: [1.8, 0, 0],
      rightWrist: [0.3, 0.2, 0],
      head: [0.15, 0, 0],
    },
    {
      rightShoulder: [0.4, -0.2, 0.2],
      rightElbow: [0.8, 0, 0],
      rightWrist: [0.1, 0, 0],
    },
  ],
  how: [
    {
      leftShoulder: [0.5, 0.4, 0.3],
      leftElbow: [1.3, 0, 0],
      rightShoulder: [0.5, -0.4, -0.3],
      rightElbow: [1.3, 0, 0],
      head: [0.1, 0, 0],
    },
  ],
  danger: [
    {
      rightShoulder: [0.9, -0.2, 0.3],
      rightElbow: [1.6, 0, 0],
      head: [0.2, 0, 0],
    },
  ],
  safe: [
    {
      leftShoulder: [0.6, 0.5, 0.5],
      leftElbow: [1.5, 0, 0],
      rightShoulder: [0.6, -0.5, -0.5],
      rightElbow: [1.5, 0, 0],
    },
  ],
  water: [
    {
      rightShoulder: [0.8, -0.4, 0.2],
      rightElbow: [1.7, 0, 0],
      rightWrist: [0.3, 0.2, 0],
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
  // Digits 1-5
  '1': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0] }],
  '2': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0] }],
  '3': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0] }],
  '4': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0] }],
  '5': [{ rightShoulder: [0.7, -0.3, 0.3], rightElbow: [1.3, 0, 0] }],
  // Alphabet A-Z
  a: [{ rightShoulder: [0.6, -0.3, 0.2], rightElbow: [1.2, 0, 0] }],
  b: [{ rightShoulder: [0.7, -0.3, 0.2], rightElbow: [1.3, 0, 0] }],
  c: [{ rightShoulder: [0.6, -0.3, 0.3], rightElbow: [1.2, 0, 0] }],
};

export default function FreshAvatar3D({
  currentWord = '',
  isSigning = false,
  signingSpeed = 1.0,
}: FreshAvatar3DProps) {
  // Joint Group References
  const spineGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);

  const leftShoulderGroupRef = useRef<THREE.Group>(null);
  const leftElbowGroupRef = useRef<THREE.Group>(null);
  const leftWristGroupRef = useRef<THREE.Group>(null);

  const rightShoulderGroupRef = useRef<THREE.Group>(null);
  const rightElbowGroupRef = useRef<THREE.Group>(null);
  const rightWristGroupRef = useRef<THREE.Group>(null);

  const leftFingersRef = useRef<Array<THREE.Group | null>>([]);
  const rightFingersRef = useRef<Array<THREE.Group | null>>([]);
  const leftThumbRef = useRef<THREE.Group | null>(null);
  const rightThumbRef = useRef<THREE.Group | null>(null);

  leftFingersRef.current = [];
  rightFingersRef.current = [];

  // Premium Materials
  const skinMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#e0a98c'),
        roughness: 0.55,
        metalness: 0.05,
      }),
    []
  );

  const jacketMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#1e293b'),
        roughness: 0.4,
        metalness: 0.3,
      }),
    []
  );

  const trimMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#00f0ff'),
        emissive: new THREE.Color('#00a8ff'),
        emissiveIntensity: 0.4,
        roughness: 0.2,
      }),
    []
  );

  const hairMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0f172a'),
        roughness: 0.3,
        metalness: 0.1,
      }),
    []
  );

  const eyeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'),
        roughness: 0.1,
      }),
    []
  );

  const pupilMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#020617'),
        roughness: 0.05,
      }),
    []
  );

  // Animation Frame Loop
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const lerpFactor = Math.min(1.0, delta * 8.0 * signingSpeed);

    const wordKey = currentWord.toLowerCase().trim();
    const keyframes = GESTURE_TARGETS[wordKey] || GESTURE_TARGETS.idle;
    const keyframeIndex = Math.floor(time * 2.0 * signingSpeed) % keyframes.length;
    const target = keyframes[keyframeIndex] || GESTURE_TARGETS.idle[0];

    const breathY = Math.sin(time * 2.0) * 0.012;
    const breathRotX = Math.cos(time * 1.5) * 0.008;

    // Apply Spine Breathing Sway
    if (spineGroupRef.current) {
      const targetSpine = target.spine || [0, 0, 0];
      spineGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        spineGroupRef.current.rotation.x,
        targetSpine[0] + breathRotX,
        lerpFactor
      );
      spineGroupRef.current.position.y = THREE.MathUtils.lerp(
        spineGroupRef.current.position.y,
        breathY,
        lerpFactor
      );
    }

    // Apply Head Rotation
    if (headGroupRef.current) {
      const targetHead = target.head || [0, 0, 0];
      headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        headGroupRef.current.rotation.x,
        targetHead[0] + Math.sin(time * 1.8) * 0.015,
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

    // Apply Left Arm
    if (leftShoulderGroupRef.current) {
      const targetLS = target.leftShoulder || [0.1, 0, -0.15];
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
      const targetLE = target.leftElbow || [0.35, 0, 0];
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

    // Apply Right Arm
    if (rightShoulderGroupRef.current) {
      const targetRS = target.rightShoulder || [0.1, 0, 0.15];
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
      const targetRE = target.rightElbow || [0.35, 0, 0];
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

    // Apply Left Fingers and Thumb Bending
    const leftFingersVal = target.leftFingers !== undefined ? target.leftFingers : 0.1;
    const leftCurlAngle = leftFingersVal * 1.4;
    leftFingersRef.current.forEach(finger => {
      if (finger) {
        finger.rotation.x = THREE.MathUtils.lerp(
          finger.rotation.x,
          -leftCurlAngle,
          lerpFactor
        );
      }
    });
    if (leftThumbRef.current) {
      leftThumbRef.current.rotation.y = THREE.MathUtils.lerp(
        leftThumbRef.current.rotation.y,
        leftCurlAngle * 0.5,
        lerpFactor
      );
    }

    // Apply Right Fingers and Thumb Bending
    const rightFingersVal = target.rightFingers !== undefined ? target.rightFingers : 0.1;
    const rightCurlAngle = rightFingersVal * 1.4;
    rightFingersRef.current.forEach(finger => {
      if (finger) {
        finger.rotation.x = THREE.MathUtils.lerp(
          finger.rotation.x,
          -rightCurlAngle,
          lerpFactor
        );
      }
    });
    if (rightThumbRef.current) {
      rightThumbRef.current.rotation.y = THREE.MathUtils.lerp(
        rightThumbRef.current.rotation.y,
        -rightCurlAngle * 0.5,
        lerpFactor
      );
    }
  });

  const LEFT_FINGER_SPECS = [
    { name: 'pinky', xOff: -0.022, len: 0.038, rad: 0.005, yOff: -0.075 },
    { name: 'ring', xOff: -0.007, len: 0.050, rad: 0.006, yOff: -0.082 },
    { name: 'middle', xOff: 0.007, len: 0.055, rad: 0.0065, yOff: -0.085 },
    { name: 'index', xOff: 0.022, len: 0.048, rad: 0.006, yOff: -0.080 }
  ];

  const RIGHT_FINGER_SPECS = [
    { name: 'index', xOff: -0.022, len: 0.048, rad: 0.006, yOff: -0.080 },
    { name: 'middle', xOff: -0.007, len: 0.055, rad: 0.0065, yOff: -0.085 },
    { name: 'ring', xOff: 0.007, len: 0.050, rad: 0.006, yOff: -0.082 },
    { name: 'pinky', xOff: 0.022, len: 0.038, rad: 0.005, yOff: -0.075 }
  ];

  return (
    <group position={[0, -0.1, 0]} scale={1.15}>
      <group ref={spineGroupRef}>
        {/* Sleek Upper Body Torso Jacket */}
        <mesh position={[0, 0.22, 0]} material={jacketMaterial}>
          <cylinderGeometry args={[0.22, 0.19, 0.44, 24]} />
        </mesh>
        {/* Neon Collar Trim */}
        <mesh position={[0, 0.43, 0]} rotation={[Math.PI / 2, 0, 0]} material={trimMaterial}>
          <torusGeometry args={[0.11, 0.015, 12, 24]} />
        </mesh>
        {/* Chest Accent Badge */}
        <mesh position={[0, 0.32, 0.18]} material={trimMaterial}>
          <boxGeometry args={[0.08, 0.08, 0.01]} />
        </mesh>
        {/* Waist Base Trim */}
        <mesh position={[0, 0.01, 0]} material={trimMaterial}>
          <cylinderGeometry args={[0.195, 0.195, 0.02, 24]} />
        </mesh>

        {/* Neck */}
        <mesh position={[0, 0.48, 0]} material={skinMaterial}>
          <cylinderGeometry args={[0.075, 0.08, 0.12, 16]} />
        </mesh>

        {/* HEAD STRUCTURE */}
        <group ref={headGroupRef} position={[0, 0.65, 0]}>
          {/* Head Sphere Mesh */}
          <mesh material={skinMaterial}>
            <sphereGeometry args={[0.16, 32, 32]} />
          </mesh>
          {/* Styled Hair Cap */}
          <mesh position={[0, 0.04, -0.01]} material={hairMaterial}>
            <sphereGeometry args={[0.168, 24, 24]} />
          </mesh>
          {/* Eyes */}
          <group position={[0, 0.02, 0.13]}>
            <mesh position={[-0.055, 0, 0]} material={eyeMaterial}>
              <sphereGeometry args={[0.022, 16, 16]} />
            </mesh>
            <mesh position={[-0.055, 0, 0.015]} material={pupilMaterial}>
              <sphereGeometry args={[0.011, 16, 16]} />
            </mesh>
            <mesh position={[0.055, 0, 0]} material={eyeMaterial}>
              <sphereGeometry args={[0.022, 16, 16]} />
            </mesh>
            <mesh position={[0.055, 0, 0.015]} material={pupilMaterial}>
              <sphereGeometry args={[0.011, 16, 16]} />
            </mesh>
          </group>
          {/* Nose */}
          <mesh position={[0, -0.01, 0.155]} material={skinMaterial}>
            <sphereGeometry args={[0.016, 12, 12]} />
          </mesh>
        </group>

        {/* LEFT ARM */}
        <group position={[-0.23, 0.40, 0]}>
          {/* Shoulder Joint Sphere */}
          <mesh material={jacketMaterial}>
            <sphereGeometry args={[0.055, 16, 16]} />
          </mesh>

          <group ref={leftShoulderGroupRef}>
            {/* Upper Arm Sleeve */}
            <mesh position={[-0.01, -0.15, 0]} material={jacketMaterial}>
              <cylinderGeometry args={[0.045, 0.04, 0.26, 16]} />
            </mesh>

            {/* Elbow Joint */}
            <group position={[-0.01, -0.29, 0]}>
              <mesh material={skinMaterial}>
                <sphereGeometry args={[0.038, 16, 16]} />
              </mesh>

              <group ref={leftElbowGroupRef}>
                {/* Forearm */}
                <mesh position={[0, -0.14, 0]} material={skinMaterial}>
                  <cylinderGeometry args={[0.036, 0.03, 0.25, 16]} />
                </mesh>

                {/* Wrist Joint */}
                <group position={[0, -0.27, 0]}>
                  <group ref={leftWristGroupRef}>
                    {/* Hand Palm Plate */}
                    <mesh position={[0, -0.035, 0]} material={skinMaterial}>
                      <boxGeometry args={[0.055, 0.07, 0.016]} />
                    </mesh>
                    {/* Fleshy Thenar Eminence (Thumb Base Pad) */}
                    <mesh position={[0.015, -0.04, 0.006]} material={skinMaterial}>
                      <sphereGeometry args={[0.018, 12, 12]} />
                    </mesh>

                    {/* 5 Articulated Fingers */}
                    {LEFT_FINGER_SPECS.map((spec, fIdx) => (
                      <group 
                        key={`l-finger-${fIdx}`} 
                        position={[spec.xOff, spec.yOff, 0]}
                        ref={(el: THREE.Group | null) => {
                          if (el) leftFingersRef.current[fIdx] = el;
                        }}
                      >
                        {/* Knuckle sphere at the base joint */}
                        <mesh position={[0, spec.len / 2, 0]} material={skinMaterial}>
                          <sphereGeometry args={[spec.rad * 1.25, 8, 8]} />
                        </mesh>
                        {/* Finger Segment using Capsule for rounded tips */}
                        <mesh material={skinMaterial}>
                          <capsuleGeometry args={[spec.rad, spec.len - spec.rad * 2, 4, 8]} />
                        </mesh>
                      </group>
                    ))}
                    {/* Thumb */}
                    <group 
                      ref={leftThumbRef}
                      position={[0.025, -0.03, 0.01]} 
                      rotation={[0, 0, -0.5]}
                    >
                      {/* Knuckle joint at thumb base */}
                      <mesh position={[0, 0.018, 0]} material={skinMaterial}>
                        <sphereGeometry args={[0.009, 8, 8]} />
                      </mesh>
                      <mesh material={skinMaterial}>
                        <capsuleGeometry args={[0.0075, 0.036 - 0.015, 4, 8]} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* RIGHT ARM */}
        <group position={[0.23, 0.40, 0]}>
          {/* Shoulder Joint Sphere */}
          <mesh material={jacketMaterial}>
            <sphereGeometry args={[0.055, 16, 16]} />
          </mesh>

          <group ref={rightShoulderGroupRef}>
            {/* Upper Arm Sleeve */}
            <mesh position={[0.01, -0.15, 0]} material={jacketMaterial}>
              <cylinderGeometry args={[0.045, 0.04, 0.26, 16]} />
            </mesh>

            {/* Elbow Joint */}
            <group position={[0.01, -0.29, 0]}>
              <mesh material={skinMaterial}>
                <sphereGeometry args={[0.038, 16, 16]} />
              </mesh>

              <group ref={rightElbowGroupRef}>
                {/* Forearm */}
                <mesh position={[0, -0.14, 0]} material={skinMaterial}>
                  <cylinderGeometry args={[0.036, 0.03, 0.25, 16]} />
                </mesh>

                {/* Wrist Joint */}
                <group position={[0, -0.27, 0]}>
                  <group ref={rightWristGroupRef}>
                    {/* Hand Palm Plate */}
                    <mesh position={[0, -0.035, 0]} material={skinMaterial}>
                      <boxGeometry args={[0.055, 0.07, 0.016]} />
                    </mesh>
                    {/* Fleshy Thenar Eminence (Thumb Base Pad) */}
                    <mesh position={[-0.015, -0.04, 0.006]} material={skinMaterial}>
                      <sphereGeometry args={[0.018, 12, 12]} />
                    </mesh>

                    {/* 5 Articulated Fingers */}
                    {RIGHT_FINGER_SPECS.map((spec, fIdx) => (
                      <group 
                        key={`r-finger-${fIdx}`} 
                        position={[spec.xOff, spec.yOff, 0]}
                        ref={(el: THREE.Group | null) => {
                          if (el) rightFingersRef.current[fIdx] = el;
                        }}
                      >
                        {/* Knuckle sphere at the base joint */}
                        <mesh position={[0, spec.len / 2, 0]} material={skinMaterial}>
                          <sphereGeometry args={[spec.rad * 1.25, 8, 8]} />
                        </mesh>
                        {/* Finger Segment using Capsule for rounded tips */}
                        <mesh material={skinMaterial}>
                          <capsuleGeometry args={[spec.rad, spec.len - spec.rad * 2, 4, 8]} />
                        </mesh>
                      </group>
                    ))}
                    {/* Thumb */}
                    <group 
                      ref={rightThumbRef}
                      position={[-0.025, -0.03, 0.01]} 
                      rotation={[0, 0, 0.5]}
                    >
                      {/* Knuckle joint at thumb base */}
                      <mesh position={[0, 0.018, 0]} material={skinMaterial}>
                        <sphereGeometry args={[0.009, 8, 8]} />
                      </mesh>
                      <mesh material={skinMaterial}>
                        <capsuleGeometry args={[0.0075, 0.036 - 0.015, 4, 8]} />
                      </mesh>
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
