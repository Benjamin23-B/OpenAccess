'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface JointRotations {
  leftShoulder?: { x: number; y: number; z: number };
  leftElbow?: { x: number; y: number; z: number };
  leftWrist?: { x: number; y: number; z: number };
  rightShoulder?: { x: number; y: number; z: number };
  rightElbow?: { x: number; y: number; z: number };
  rightWrist?: { x: number; y: number; z: number };
  head?: { x: number; y: number; z: number };
}

interface GestureKeyframe {
  rotations: JointRotations;
  duration: number; // in ms
}

// Predefined ISL Gestures
const GESTURES: Record<string, GestureKeyframe[]> = {
  idle: [
    {
      rotations: {
        leftShoulder: { x: 0.1, y: 0.1, z: -1.2 },
        leftElbow: { x: 0.4, y: 0, z: 0 },
        leftWrist: { x: 0, y: 0, z: 0 },
        rightShoulder: { x: 0.1, y: -0.1, z: 1.2 },
        rightElbow: { x: 0.4, y: 0, z: 0 },
        rightWrist: { x: 0, y: 0, z: 0 },
        head: { x: 0, y: 0, z: 0 },
      },
      duration: 300,
    },
  ],
  hello: [
    {
      rotations: {
        leftShoulder: { x: 0.5, y: 0.2, z: 0.3 },
        rightShoulder: { x: 0.5, y: -0.2, z: -0.3 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        rightElbow: { x: 1.2, y: 0, z: 0 },
        leftWrist: { x: 0, y: -0.5, z: 0.5 },
        rightWrist: { x: 0, y: 0.5, z: -0.5 },
      },
      duration: 300,
    },
    {
      rotations: {
        leftShoulder: { x: 0.8, y: 0.4, z: 0.2 },
        rightShoulder: { x: 0.8, y: -0.4, z: -0.2 },
        leftElbow: { x: 1.6, y: -0.2, z: 0 },
        rightElbow: { x: 1.6, y: 0.2, z: 0 },
        leftWrist: { x: 0.2, y: -0.8, z: 0.8 },
        rightWrist: { x: 0.2, y: 0.8, z: -0.8 },
        head: { x: 0.3, y: 0, z: 0 },
      },
      duration: 600,
    },
    {
      rotations: {
        leftShoulder: { x: 0.8, y: 0.4, z: 0.2 },
        rightShoulder: { x: 0.8, y: -0.4, z: -0.2 },
        leftElbow: { x: 1.6, y: -0.2, z: 0 },
        rightElbow: { x: 1.6, y: 0.2, z: 0 },
        leftWrist: { x: 0.2, y: -0.8, z: 0.8 },
        rightWrist: { x: 0.2, y: 0.8, z: -0.8 },
        head: { x: 0.3, y: 0, z: 0 },
      },
      duration: 800,
    },
  ],
  thanks: [
    {
      rotations: {
        rightShoulder: { x: 0.8, y: -0.4, z: 0.2 },
        rightElbow: { x: 1.8, y: 0, z: 0 },
        rightWrist: { x: 0.1, y: 0.4, z: 0 },
      },
      duration: 350,
    },
    {
      rotations: {
        rightShoulder: { x: 0.3, y: -0.2, z: 0.5 },
        rightElbow: { x: 0.6, y: 0, z: 0 },
        rightWrist: { x: 0.4, y: 0.1, z: 0 },
        head: { x: 0.15, y: 0, z: 0 },
      },
      duration: 550,
    },
    {
      rotations: {
        rightShoulder: { x: 0.3, y: -0.2, z: 0.5 },
        rightElbow: { x: 0.6, y: 0, z: 0 },
        rightWrist: { x: 0.4, y: 0.1, z: 0 },
      },
      duration: 600,
    },
  ],
  please: [
    {
      rotations: {
        rightShoulder: { x: 0.4, y: -0.6, z: 0.1 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0, y: 0.3, z: 0 },
      },
      duration: 300,
    },
    {
      rotations: {
        rightShoulder: { x: 0.5, y: -0.5, z: 0.2 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0, y: 0.3, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.3, y: -0.7, z: 0.1 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0, y: 0.3, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.5, y: -0.5, z: 0.2 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0, y: 0.3, z: 0 },
      },
      duration: 250,
    },
  ],
  help: [
    {
      rotations: {
        leftShoulder: { x: 0.5, y: 0.3, z: 0.3 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        leftWrist: { x: 0, y: -0.5, z: 0.5 },
        rightShoulder: { x: 0.6, y: -0.3, z: -0.2 },
        rightElbow: { x: 1.3, y: 0, z: 0 },
        rightWrist: { x: 0, y: 0.4, z: -0.4 },
      },
      duration: 400,
    },
    {
      rotations: {
        leftShoulder: { x: 0.8, y: 0.2, z: 0.4 },
        rightShoulder: { x: 0.9, y: -0.2, z: -0.3 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        rightElbow: { x: 1.3, y: 0, z: 0 },
      },
      duration: 500,
    },
    {
      rotations: {
        leftShoulder: { x: 0.8, y: 0.2, z: 0.4 },
        rightShoulder: { x: 0.9, y: -0.2, z: -0.3 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        rightElbow: { x: 1.3, y: 0, z: 0 },
      },
      duration: 600,
    },
  ],
  yes: [
    {
      rotations: {
        rightShoulder: { x: 0.6, y: -0.3, z: 0.3 },
        rightElbow: { x: 1.0, y: 0, z: 0 },
        rightWrist: { x: -0.4, y: 0, z: 0 },
      },
      duration: 300,
    },
    {
      rotations: {
        rightShoulder: { x: 0.6, y: -0.3, z: 0.3 },
        rightElbow: { x: 1.0, y: 0, z: 0 },
        rightWrist: { x: 0.4, y: 0, z: 0 },
        head: { x: 0.2, y: 0, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.6, y: -0.3, z: 0.3 },
        rightElbow: { x: 1.0, y: 0, z: 0 },
        rightWrist: { x: -0.4, y: 0, z: 0 },
        head: { x: -0.05, y: 0, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.6, y: -0.3, z: 0.3 },
        rightElbow: { x: 1.0, y: 0, z: 0 },
        rightWrist: { x: 0.4, y: 0.2, z: 0 },
        head: { x: 0.2, y: 0, z: 0 },
      },
      duration: 250,
    },
  ],
  no: [
    {
      rotations: {
        rightShoulder: { x: 0.7, y: -0.4, z: 0.4 },
        rightElbow: { x: 1.1, y: 0, z: 0 },
        rightWrist: { x: 0, y: -0.3, z: 0 },
      },
      duration: 300,
    },
    {
      rotations: {
        rightShoulder: { x: 0.7, y: -0.4, z: 0.4 },
        rightElbow: { x: 1.1, y: 0, z: 0 },
        rightWrist: { x: 0, y: -0.8, z: 0 },
        head: { x: 0, y: -0.15, z: 0 },
      },
      duration: 200,
    },
    {
      rotations: {
        rightShoulder: { x: 0.7, y: -0.4, z: 0.4 },
        rightElbow: { x: 1.1, y: 0, z: 0 },
        rightWrist: { x: 0, y: 0.2, z: 0 },
        head: { x: 0, y: 0.15, z: 0 },
      },
      duration: 200,
    },
    {
      rotations: {
        rightShoulder: { x: 0.7, y: -0.4, z: 0.4 },
        rightElbow: { x: 1.1, y: 0, z: 0 },
        rightWrist: { x: 0, y: -0.8, z: 0 },
        head: { x: 0, y: -0.15, z: 0 },
      },
      duration: 200,
    },
  ],
  sorry: [
    {
      rotations: {
        rightShoulder: { x: 0.4, y: -0.6, z: 0.1 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0.2, y: 0.2, z: 0 },
        head: { x: 0.3, y: 0, z: 0.1 },
      },
      duration: 350,
    },
    {
      rotations: {
        rightShoulder: { x: 0.5, y: -0.5, z: 0.15 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0.2, y: 0.2, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.3, y: -0.7, z: 0.05 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0.2, y: 0.2, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.3, y: -0.7, z: 0.05 },
        rightElbow: { x: 1.4, y: 0, z: 0 },
        rightWrist: { x: 0.2, y: 0.2, z: 0 },
        head: { x: 0.3, y: 0, z: 0.1 },
      },
      duration: 500,
    },
  ],
  love: [
    {
      rotations: {
        leftShoulder: { x: 0.6, y: 0.5, z: 0.4 },
        rightShoulder: { x: 0.6, y: -0.5, z: -0.4 },
        leftElbow: { x: 1.5, y: -0.3, z: 0 },
        rightElbow: { x: 1.5, y: 0.3, z: 0 },
      },
      duration: 400,
    },
    {
      rotations: {
        leftShoulder: { x: 0.8, y: 0.6, z: 0.2 },
        rightShoulder: { x: 0.8, y: -0.6, z: -0.2 },
        leftElbow: { x: 1.8, y: -0.5, z: 0 },
        rightElbow: { x: 1.8, y: 0.5, z: 0 },
        head: { x: 0.1, y: 0, z: 0 },
      },
      duration: 500,
    },
    {
      rotations: {
        leftShoulder: { x: 0.8, y: 0.6, z: 0.2 },
        rightShoulder: { x: 0.8, y: -0.6, z: -0.2 },
        leftElbow: { x: 1.8, y: -0.5, z: 0 },
        rightElbow: { x: 1.8, y: 0.5, z: 0 },
      },
      duration: 700,
    },
  ],
  happy: [
    {
      rotations: {
        leftShoulder: { x: 0.5, y: 0.3, z: 0.2 },
        rightShoulder: { x: 0.5, y: -0.3, z: -0.2 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        rightElbow: { x: 1.2, y: 0, z: 0 },
      },
      duration: 300,
    },
    {
      rotations: {
        rightShoulder: { x: 0.6, y: -0.2, z: -0.1 },
        leftShoulder: { x: 0.4, y: 0.4, z: 0.3 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        rightElbow: { x: 1.2, y: 0, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.4, y: -0.4, z: -0.3 },
        leftShoulder: { x: 0.6, y: 0.2, z: 0.1 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        rightElbow: { x: 1.2, y: 0, z: 0 },
      },
      duration: 250,
    },
    {
      rotations: {
        rightShoulder: { x: 0.6, y: -0.2, z: -0.1 },
        leftShoulder: { x: 0.4, y: 0.4, z: 0.3 },
        leftElbow: { x: 1.2, y: 0, z: 0 },
        rightElbow: { x: 1.2, y: 0, z: 0 },
      },
      duration: 250,
    },
  ],
};

// Map alternate word formats to base gestures
const GESTURE_MAP: Record<string, string> = {
  hello: 'hello',
  namaste: 'hello',
  hi: 'hello',
  welcome: 'hello',
  thanks: 'thanks',
  thankyou: 'thanks',
  'thank you': 'thanks',
  please: 'please',
  help: 'help',
  yes: 'yes',
  no: 'no',
  sorry: 'sorry',
  love: 'love',
  happy: 'happy',
};

interface AvatarRendererProps {
  textToSign?: string;
  signingSpeed?: number;
  onStatusChange?: (status: string) => void;
}

export default function AvatarRenderer({
  textToSign = '',
  signingSpeed = 1.0,
  onStatusChange,
}: AvatarRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // References to joints for animating
  const jointsRef = useRef<{
    leftShoulder: THREE.Object3D;
    leftElbow: THREE.Object3D;
    leftWrist: THREE.Object3D;
    rightShoulder: THREE.Object3D;
    rightElbow: THREE.Object3D;
    rightWrist: THREE.Object3D;
    head: THREE.Object3D;
  } | null>(null);

  // References to ghost joints for motion blur
  const ghostJointsRef = useRef<{
    leftShoulder: THREE.Object3D;
    leftElbow: THREE.Object3D;
    leftWrist: THREE.Object3D;
    rightShoulder: THREE.Object3D;
    rightElbow: THREE.Object3D;
    rightWrist: THREE.Object3D;
    head: THREE.Object3D;
  } | null>(null);

  // Queue of words/letters to sign
  const queueRef = useRef<{ type: 'word' | 'letter'; val: string }[]>([]);
  const currentItemRef = useRef<{ type: 'word' | 'letter'; val: string } | null>(null);
  const currentKeyframeIdxRef = useRef<number>(0);
  const keyframeTimerRef = useRef<number>(0);
  const keyframeDurationRef = useRef<number>(0);

  // Target rotations for interpolation
  const targetRotationsRef = useRef<Required<JointRotations>>({
    leftShoulder: { x: 0.1, y: 0.1, z: -1.2 },
    leftElbow: { x: 0.4, y: 0, z: 0 },
    leftWrist: { x: 0, y: 0, z: 0 },
    rightShoulder: { x: 0.1, y: -0.1, z: 1.2 },
    rightElbow: { x: 0.4, y: 0, z: 0 },
    rightWrist: { x: 0, y: 0, z: 0 },
    head: { x: 0, y: 0, z: 0 },
  });

  // Track prop updates
  const prevTextRef = useRef('');

  useEffect(() => {
    if (textToSign && textToSign !== prevTextRef.current) {
      prevTextRef.current = textToSign;

      // Extract words
      const cleaned = textToSign
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .split(/\s+/);

      const items: { type: 'word' | 'letter'; val: string }[] = [];
      for (const word of cleaned) {
        if (!word.trim()) continue;
        const mapped = GESTURE_MAP[word];
        if (mapped) {
          items.push({ type: 'word', val: mapped });
        } else {
          // fingerspell unknown words letter-by-letter
          for (let i = 0; i < word.length; i++) {
            items.push({ type: 'letter', val: word[i] });
          }
        }
      }

      queueRef.current = [...queueRef.current, ...items];
    }
  }, [textToSign]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 400;

    // 1. Setup Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x13171e); // Dark theme matching app-bg-secondary

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.45, 2.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // 2. Lighting: Three-point professional studio lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xd9ebff, 0x161b22, 0.45);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Warm Key Light (front-right)
    const keyLight = new THREE.DirectionalLight(0xfffaed, 0.95);
    keyLight.position.set(2.5, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Cool Fill Light (front-left)
    const fillLight = new THREE.DirectionalLight(0xe8f4ff, 0.55);
    fillLight.position.set(-2.5, 2, 3);
    scene.add(fillLight);

    // High-contrast Rim Light (rear-left, highlighting silhouette contours)
    const rimLight = new THREE.DirectionalLight(0xffffff, 1.45);
    rimLight.position.set(-2.5, 3.5, -4);
    scene.add(rimLight);

    // 3. Materials
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xe0a98c, // Indian skin tone
      roughness: 0.55,
      metalness: 0.05,
    });

    const shirtMaterial = new THREE.MeshStandardMaterial({
      color: 0x2b5491, // Deep premium knitted blue shirt color
      roughness: 0.82,
      metalness: 0.08,
    });

    const cuffMaterial = new THREE.MeshStandardMaterial({
      color: 0x1c3a6b, // Darker blue contrast for collar and wrist cuffs
      roughness: 0.85,
    });

    const hairMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c0c0d, // Silky thick black hair
      roughness: 0.32,  // shiny/straight texture
      metalness: 0.08,
    });

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.12,
      metalness: 0.08,
    });

    const pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c0c0d,
      roughness: 0.05,
      metalness: 0.0,
    });

    const cheekMaterial = new THREE.MeshBasicMaterial({
      color: 0xff88aa,
      transparent: true,
      opacity: 0.22,
    });

    const catchlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const skeletonJointMaterial = new THREE.MeshBasicMaterial({
      color: 0x3fb950, // Glowing green joints
      transparent: true,
      opacity: 0.9,
      visible: false, // Hide skeleton tracking stick/joints
    });

    const skeletonBoneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88, // Glowing green bones
      transparent: true,
      opacity: 0.7,
      wireframe: true,
      visible: false, // Hide skeleton tracking stick/joints
    });

    const ghostJointMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
      visible: false, // Hide skeleton tracking stick/joints
    });

    const ghostBoneMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff88,
      transparent: true,
      opacity: 0.08,
      wireframe: true,
      blending: THREE.AdditiveBlending,
      visible: false, // Hide skeleton tracking stick/joints
    });

    // Helper: Add skeleton overlay spheres and lines to joint
    const makeJointVisuals = (parentJoint: THREE.Object3D, isGhost = false) => {
      // Joint Sphere
      const sphereGeo = new THREE.SphereGeometry(isGhost ? 0.045 : 0.035, 12, 12);
      const sphereMesh = new THREE.Mesh(
        sphereGeo,
        isGhost ? ghostJointMaterial : skeletonJointMaterial
      );
      parentJoint.add(sphereMesh);
      return sphereMesh;
    };

    // Helper: Create a bone connector cylinder between joint and its child
    const makeBoneVisuals = (parentJoint: THREE.Object3D, len: number, isGhost = false) => {
      const boneGeo = new THREE.CylinderGeometry(0.015, 0.01, len, 8);
      boneGeo.translate(0, -len / 2, 0); // pivot at top
      const boneMesh = new THREE.Mesh(
        boneGeo,
        isGhost ? ghostBoneMaterial : skeletonBoneMaterial
      );
      parentJoint.add(boneMesh);
      return boneMesh;
    };

    // Helper: Build Skeleton / Hierarchy
    const buildHierarchy = (isGhost = false) => {
      const shoulderWidth = 0.64;
      const upperArmLen = 0.35;
      const lowerArmLen = 0.32;
      const headHeight = 0.30;

      const group = new THREE.Group();

      // Main Root joints
      const head = new THREE.Object3D();
      head.position.set(0, 0.94, 0);

      const leftShoulder = new THREE.Object3D();
      leftShoulder.position.set(-shoulderWidth / 2, 0.8, 0);

      const leftElbow = new THREE.Object3D();
      leftElbow.position.set(0, -upperArmLen, 0);

      const leftWrist = new THREE.Object3D();
      leftWrist.position.set(0, -lowerArmLen, 0);

      const rightShoulder = new THREE.Object3D();
      rightShoulder.position.set(shoulderWidth / 2, 0.8, 0);

      const rightElbow = new THREE.Object3D();
      rightElbow.position.set(0, -upperArmLen, 0);

      const rightWrist = new THREE.Object3D();
      rightWrist.position.set(0, -lowerArmLen, 0);

      // Spine joints
      const pelvisJoint = new THREE.Object3D();
      pelvisJoint.position.set(0, 0.05, 0);

      const chestJoint = new THREE.Object3D();
      chestJoint.position.set(0, 0.42, 0);

      // Hierarchical links
      group.add(head);
      group.add(leftShoulder);
      leftShoulder.add(leftElbow);
      leftElbow.add(leftWrist);

      group.add(rightShoulder);
      rightShoulder.add(rightElbow);
      rightElbow.add(rightWrist);

      group.add(pelvisJoint);
      group.add(chestJoint);

      // Skeleton material choice
      const jointMat = isGhost ? ghostJointMaterial : skeletonJointMaterial;
      const boneMat = isGhost ? ghostBoneMaterial : skeletonBoneMaterial;

      // Helper to add manual bone lines
      const addManualBoneLine = (p1: THREE.Vector3, p2: THREE.Vector3) => {
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = dir.length();
        const geom = new THREE.CylinderGeometry(0.012, 0.009, len, 6);
        geom.translate(0, len / 2, 0);
        const mesh = new THREE.Mesh(geom, boneMat);
        mesh.position.copy(p1);
        // Align cylinder with direction vector
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
        group.add(mesh);
      };

      // Add spine skeleton overlays
      // 1. Joint spheres
      const sPelvis = new THREE.Mesh(new THREE.SphereGeometry(isGhost ? 0.042 : 0.032, 12, 12), jointMat);
      sPelvis.position.copy(pelvisJoint.position);
      group.add(sPelvis);

      const sChest = new THREE.Mesh(new THREE.SphereGeometry(isGhost ? 0.042 : 0.032, 12, 12), jointMat);
      sChest.position.copy(chestJoint.position);
      group.add(sChest);

      const sNeck = new THREE.Mesh(new THREE.SphereGeometry(isGhost ? 0.038 : 0.028, 12, 12), jointMat);
      sNeck.position.set(0, 0.77, 0); // Neck base collar height
      group.add(sNeck);

      const sHead = new THREE.Mesh(new THREE.SphereGeometry(isGhost ? 0.038 : 0.028, 12, 12), jointMat);
      sHead.position.copy(head.position);
      group.add(sHead);

      // 2. Bone lines (Pelvis -> Chest -> Neck Base -> Head & Shoulders)
      addManualBoneLine(pelvisJoint.position, chestJoint.position);
      addManualBoneLine(chestJoint.position, new THREE.Vector3(0, 0.77, 0)); // Chest to neck base
      addManualBoneLine(new THREE.Vector3(0, 0.77, 0), head.position); // Neck base to head base
      addManualBoneLine(new THREE.Vector3(0, 0.77, 0), leftShoulder.position); // Neck to left shoulder
      addManualBoneLine(new THREE.Vector3(0, 0.77, 0), rightShoulder.position); // Neck to right shoulder
      addManualBoneLine(chestJoint.position, leftShoulder.position); // Chest to left shoulder
      addManualBoneLine(chestJoint.position, rightShoulder.position); // Chest to right shoulder

      // Visual components (ONLY add to the non-ghost avatar)
      if (!isGhost) {
        // Torso/Sweater Mesh
        const torsoGeo = new THREE.CylinderGeometry(0.24, 0.20, 0.8, 20);
        const torsoMesh = new THREE.Mesh(torsoGeo, shirtMaterial);
        torsoMesh.position.set(0, 0.4, 0);
        torsoMesh.receiveShadow = true;
        torsoMesh.castShadow = true;
        group.add(torsoMesh);

        // Collar (cuff contrast material)
        const collarGeo = new THREE.TorusGeometry(0.08, 0.02, 8, 24);
        const collarMesh = new THREE.Mesh(collarGeo, cuffMaterial);
        collarMesh.position.set(0, 0.8, 0);
        collarMesh.rotation.x = Math.PI / 2;
        group.add(collarMesh);

        // Neck
        const neckGeo = new THREE.CylinderGeometry(0.075, 0.082, 0.16, 12);
        const neckMesh = new THREE.Mesh(neckGeo, skinMaterial);
        neckMesh.position.set(0, 0.86, 0);
        group.add(neckMesh);

        // Head Model
        const headGeo = new THREE.SphereGeometry(headHeight / 2, 24, 24);
        const headMesh = new THREE.Mesh(headGeo, skinMaterial);
        headMesh.scale.set(1, 1.15, 1.05); // oval face
        head.add(headMesh);

        // Ears
        const earGeo = new THREE.SphereGeometry(0.026, 10, 10);
        const leftEar = new THREE.Mesh(earGeo, skinMaterial);
        leftEar.position.set(-0.14, 0.0, 0.0);
        leftEar.scale.set(0.6, 1.0, 0.6);
        const rightEar = leftEar.clone();
        rightEar.position.set(0.14, 0.0, 0.0);
        head.add(leftEar);
        head.add(rightEar);

        // Perfect Nose: Nose Bridge + Nose Tip + Nostril Wings
        const noseBridgeGeo = new THREE.CylinderGeometry(0.008, 0.011, 0.045, 10);
        const noseBridge = new THREE.Mesh(noseBridgeGeo, skinMaterial);
        noseBridge.position.set(0, 0.015, 0.138);
        noseBridge.rotation.x = -0.15; // Sleek slope
        head.add(noseBridge);

        const noseTipGeo = new THREE.SphereGeometry(0.013, 10, 10);
        const noseTip = new THREE.Mesh(noseTipGeo, skinMaterial);
        noseTip.position.set(0, -0.012, 0.146);
        head.add(noseTip);

        const nostrilGeo = new THREE.SphereGeometry(0.007, 8, 8);
        const leftNostril = new THREE.Mesh(nostrilGeo, skinMaterial);
        leftNostril.position.set(-0.012, -0.015, 0.142);
        const rightNostril = leftNostril.clone();
        rightNostril.position.set(0.012, -0.015, 0.142);
        head.add(leftNostril);
        head.add(rightNostril);

        // Perfect Mouth: Upper Lip + Lower Lip + Smile Teeth
        const lipMaterial = new THREE.MeshStandardMaterial({ 
          color: 0xc45c5c, 
          roughness: 0.60,
          metalness: 0.08
        });

        // Upper Lip (Cupid's Bow arc shape)
        const upperLipGeo = new THREE.TorusGeometry(0.020, 0.004, 8, 16, Math.PI);
        const upperLip = new THREE.Mesh(upperLipGeo, lipMaterial);
        upperLip.position.set(0, -0.058, 0.132);
        upperLip.rotation.x = Math.PI; // Face downward
        upperLip.scale.set(1, 0.6, 1);
        head.add(upperLip);

        // Lower Lip (Fuller curved cushion shape)
        const lowerLipGeo = new THREE.TorusGeometry(0.018, 0.006, 8, 16, Math.PI);
        const lowerLip = new THREE.Mesh(lowerLipGeo, lipMaterial);
        lowerLip.position.set(0, -0.070, 0.130);
        lowerLip.rotation.x = 0; // Face upward
        lowerLip.scale.set(1.1, 0.7, 1);
        head.add(lowerLip);

        // Smile Teeth (gleaming white strip showing between lips)
        const teethGeo = new THREE.BoxGeometry(0.024, 0.008, 0.002);
        const teethMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const teethMesh = new THREE.Mesh(teethGeo, teethMaterial);
        teethMesh.position.set(0, -0.064, 0.128);
        head.add(teethMesh);

        // Rosy Cheeks (soft pink blush)
        const cheekGeo = new THREE.SphereGeometry(0.018, 12, 12);
        const leftCheek = new THREE.Mesh(cheekGeo, cheekMaterial);
        leftCheek.position.set(-0.09, -0.02, 0.11);
        leftCheek.scale.set(1.0, 0.6, 0.2);
        const rightCheek = leftCheek.clone();
        rightCheek.position.set(0.09, -0.02, 0.11);
        head.add(leftCheek);
        head.add(rightCheek);

        // 1. Smooth Main Hair Cap (covers top, back and sides perfectly)
        const mainCapGeo = new THREE.SphereGeometry(headHeight / 2, 24, 24);
        const mainCapMesh = new THREE.Mesh(mainCapGeo, hairMaterial);
        mainCapMesh.position.set(0, 0.038, -0.015);
        mainCapMesh.scale.set(1.04, 1.08, 1.05); // fits head snugly
        head.add(mainCapMesh);

        // 2. Styled Front Fringe/Bangs (parted straight bangs sweeping down the forehead)
        const fringeGroup = new THREE.Group();
        
        // Left fringe panel
        const fringeLGeo = new THREE.SphereGeometry(headHeight / 2, 16, 16);
        const fringeL = new THREE.Mesh(fringeLGeo, hairMaterial);
        fringeL.position.set(-0.038, 0.05, 0.02);
        fringeL.scale.set(0.75, 0.55, 0.65);
        fringeL.rotation.set(0.1, 0.2, -0.22);
        fringeGroup.add(fringeL);

        // Right fringe panel (sweeps to the side)
        const fringeRGeo = new THREE.SphereGeometry(headHeight / 2, 16, 16);
        const fringeR = new THREE.Mesh(fringeRGeo, hairMaterial);
        fringeR.position.set(0.045, 0.05, 0.02);
        fringeR.scale.set(0.72, 0.55, 0.65);
        fringeR.rotation.set(0.1, -0.2, 0.18);
        fringeGroup.add(fringeR);

        // 3. Thick Side Locks (flowing straight down over the ears)
        // Left side lock
        const sideLockLGeo = new THREE.CylinderGeometry(0.038, 0.025, 0.15, 16);
        const sideLockL = new THREE.Mesh(sideLockLGeo, hairMaterial);
        sideLockL.position.set(-0.125, -0.03, 0.005);
        sideLockL.rotation.set(0.05, 0.1, 0.06);
        fringeGroup.add(sideLockL);

        // Right side lock
        const sideLockR = sideLockL.clone();
        sideLockR.position.set(0.125, -0.03, 0.005);
        sideLockR.rotation.set(0.05, -0.1, -0.06);
        fringeGroup.add(sideLockR);

        // 4. Back Hair Flow (smooth curved coverage at the back of the neck)
        const backFlowGeo = new THREE.CylinderGeometry(headHeight / 2, headHeight / 2 - 0.008, 0.14, 20, 1, false, -Math.PI / 2, Math.PI);
        const backFlow = new THREE.Mesh(backFlowGeo, hairMaterial);
        backFlow.position.set(0, -0.055, -0.025);
        backFlow.rotation.set(0.06, 0, 0);
        fringeGroup.add(backFlow);

        head.add(fringeGroup);

        // Perfect Eyes: Sclera + Iris + Pupil + Upper Lash arch + Double Catchlights
        const irisMaterial = new THREE.MeshStandardMaterial({
          color: 0x2262a6, // Vibrant deep sky-blue iris
          roughness: 0.18,
          metalness: 0.05
        });

        // 1. Scleras (White of the eyes)
        const eyeGeo = new THREE.SphereGeometry(0.022, 12, 12);
        const leftEye = new THREE.Mesh(eyeGeo, eyeMaterial);
        leftEye.position.set(-0.055, 0.03, 0.12);
        leftEye.scale.set(1.4, 1.0, 0.6);
        const rightEye = leftEye.clone();
        rightEye.position.set(0.055, 0.03, 0.12);
        head.add(leftEye);
        head.add(rightEye);

        // 2. Irises (Blue circular layers)
        const irisGeo = new THREE.SphereGeometry(0.013, 12, 12);
        const leftIris = new THREE.Mesh(irisGeo, irisMaterial);
        leftIris.position.set(-0.055, 0.03, 0.128);
        leftIris.scale.set(1.1, 1.1, 0.4);
        const rightIris = leftIris.clone();
        rightIris.position.set(0.055, 0.03, 0.128);
        head.add(leftIris);
        head.add(rightIris);

        // 3. Pupils (Deep black centers)
        const pupilGeo = new THREE.SphereGeometry(0.007, 8, 8);
        const leftPupil = new THREE.Mesh(pupilGeo, pupilMaterial);
        leftPupil.position.set(-0.055, 0.03, 0.132);
        leftPupil.scale.set(1.0, 1.0, 0.4);
        const rightPupil = leftPupil.clone();
        rightPupil.position.set(0.055, 0.03, 0.132);
        head.add(leftPupil);
        head.add(rightPupil);

        // 4. Upper Eyelashes / Eye Liner (Black curves framing the eyes)
        const lashGeo = new THREE.TorusGeometry(0.020, 0.003, 6, 12, Math.PI);
        const leftLash = new THREE.Mesh(lashGeo, hairMaterial);
        leftLash.position.set(-0.055, 0.038, 0.126);
        leftLash.rotation.x = Math.PI; // sweep on top
        leftLash.scale.set(1.2, 0.5, 1.0);
        const rightLash = leftLash.clone();
        rightLash.position.set(0.055, 0.038, 0.126);
        head.add(leftLash);
        head.add(rightLash);

        // 5. Dual Catchlight Sparkles (Primary highlight + secondary bounce reflection)
        const catchlightGeo1 = new THREE.SphereGeometry(0.0045, 6, 6);
        const leftCl1 = new THREE.Mesh(catchlightGeo1, catchlightMaterial);
        leftCl1.position.set(-0.050, 0.038, 0.135);
        const rightCl1 = leftCl1.clone();
        rightCl1.position.set(0.060, 0.038, 0.135);
        head.add(leftCl1);
        head.add(rightCl1);

        const catchlightGeo2 = new THREE.SphereGeometry(0.002, 6, 6);
        const leftCl2 = new THREE.Mesh(catchlightGeo2, catchlightMaterial);
        leftCl2.position.set(-0.060, 0.022, 0.135);
        const rightCl2 = leftCl2.clone();
        rightCl2.position.set(0.050, 0.022, 0.135);
        head.add(leftCl2);
        head.add(rightCl2);

        // Eyebrows
        const browGeo = new THREE.BoxGeometry(0.04, 0.008, 0.005);
        const leftBrow = new THREE.Mesh(browGeo, hairMaterial);
        leftBrow.position.set(-0.055, 0.078, 0.125);
        leftBrow.rotation.z = 0.08;
        const rightBrow = leftBrow.clone();
        rightBrow.position.set(0.055, 0.078, 0.125);
        rightBrow.rotation.z = -0.08;
        head.add(leftBrow);
        head.add(rightBrow);

        // Shoulders connection (Clavicle visual bones)
        const leftClavGeo = new THREE.CylinderGeometry(0.045, 0.045, shoulderWidth / 2, 16);
        leftClavGeo.rotateZ(Math.PI / 2);
        leftClavGeo.translate(-shoulderWidth / 4, 0.77, 0);
        const leftClav = new THREE.Mesh(leftClavGeo, shirtMaterial);
        group.add(leftClav);

        const rightClav = leftClav.clone();
        rightClav.position.set(0, 0, 0);
        rightClav.scale.set(-1, 1, 1);
        group.add(rightClav);

        // Rounded Joint Spheres at Shoulders
        const shoulderGeo = new THREE.SphereGeometry(0.054, 16, 16);
        const leftShoulderMesh = new THREE.Mesh(shoulderGeo, shirtMaterial);
        leftShoulder.add(leftShoulderMesh);
        const rightShoulderMesh = new THREE.Mesh(shoulderGeo, shirtMaterial);
        rightShoulder.add(rightShoulderMesh);

        // Character Arms visual meshes (long sleeves!)
        const upperArmGeo = new THREE.CylinderGeometry(0.048, 0.042, upperArmLen, 16);
        upperArmGeo.translate(0, -upperArmLen / 2, 0);
        const leftUpperMesh = new THREE.Mesh(upperArmGeo, shirtMaterial);
        leftShoulder.add(leftUpperMesh);
        const rightUpperMesh = new THREE.Mesh(upperArmGeo, shirtMaterial);
        rightShoulder.add(rightUpperMesh);

        // Rounded Joint Spheres at Elbows
        const elbowGeo = new THREE.SphereGeometry(0.046, 16, 16);
        const leftElbowMesh = new THREE.Mesh(elbowGeo, shirtMaterial);
        leftElbow.add(leftElbowMesh);
        const rightElbowMesh = new THREE.Mesh(elbowGeo, shirtMaterial);
        rightElbow.add(rightElbowMesh);

        const lowerArmGeo = new THREE.CylinderGeometry(0.04, 0.032, lowerArmLen, 16);
        lowerArmGeo.translate(0, -lowerArmLen / 2, 0);
        const leftLowerMesh = new THREE.Mesh(lowerArmGeo, shirtMaterial); // Long sleeves!
        leftElbow.add(leftLowerMesh);
        const rightLowerMesh = new THREE.Mesh(lowerArmGeo, shirtMaterial); // Long sleeves!
        rightElbow.add(rightLowerMesh);

        // Wrist Sleeve Cuffs
        const cuffGeo = new THREE.TorusGeometry(0.038, 0.009, 8, 16);
        const leftCuff = new THREE.Mesh(cuffGeo, cuffMaterial);
        leftCuff.position.set(0, 0, 0);
        leftCuff.rotation.x = Math.PI / 2;
        leftWrist.add(leftCuff);
        const rightCuff = leftCuff.clone();
        rightWrist.add(rightCuff);

        // Palms (skin-colored hands)
        const palmGeo = new THREE.SphereGeometry(0.032, 12, 12);
        const leftPalm = new THREE.Mesh(palmGeo, skinMaterial);
        leftPalm.position.set(0, -0.02, 0);
        leftPalm.scale.set(1.1, 0.6, 1.2);
        leftWrist.add(leftPalm);
        const rightPalm = leftPalm.clone();
        rightWrist.add(rightPalm);

        // Glowing overlays (Main Skeleton joints & bones)
        makeJointVisuals(leftShoulder);
        makeJointVisuals(leftElbow);
        makeJointVisuals(leftWrist);
        makeJointVisuals(rightShoulder);
        makeJointVisuals(rightElbow);
        makeJointVisuals(rightWrist);
        makeJointVisuals(head);

        makeBoneVisuals(leftShoulder, upperArmLen);
        makeBoneVisuals(leftElbow, lowerArmLen);
        makeBoneVisuals(rightShoulder, upperArmLen);
        makeBoneVisuals(rightElbow, lowerArmLen);
      } else {
        // Glowing overlays (Ghost Skeleton joints & bones)
        makeJointVisuals(leftShoulder, true);
        makeJointVisuals(leftElbow, true);
        makeJointVisuals(leftWrist, true);
        makeJointVisuals(rightShoulder, true);
        makeJointVisuals(rightElbow, true);
        makeJointVisuals(rightWrist, true);
        makeJointVisuals(head, true);

        makeBoneVisuals(leftShoulder, upperArmLen, true);
        makeBoneVisuals(leftElbow, lowerArmLen, true);
        makeBoneVisuals(rightShoulder, upperArmLen, true);
        makeBoneVisuals(rightElbow, lowerArmLen, true);
      }

      // Add fingers to both hands
      const addFingers = (wristObj: THREE.Object3D, isRight: boolean, isGhostAvatar: boolean) => {
        const xMult = isRight ? 1 : -1;
        const fingerData = [
          { name: 'thumb', pos: [0.022 * xMult, -0.018, 0.012], rot: [0.15, -0.35 * xMult, 0.25 * xMult], len: 0.038, rad: 0.007 },
          { name: 'index', pos: [0.012 * xMult, -0.040, 0.005], rot: [-0.08, 0, 0.04 * xMult], len: 0.054, rad: 0.006 },
          { name: 'middle', pos: [0.0 * xMult, -0.046, 0.002], rot: [0, 0, 0], len: 0.060, rad: 0.006 },
          { name: 'ring', pos: [-0.012 * xMult, -0.042, 0.005], rot: [0.08, 0, -0.04 * xMult], len: 0.056, rad: 0.0055 },
          { name: 'pinky', pos: [-0.022 * xMult, -0.034, 0.010], rot: [0.15, 0.08 * xMult, -0.10 * xMult], len: 0.044, rad: 0.005 },
        ];

        const jMat = isGhostAvatar ? ghostJointMaterial : skeletonJointMaterial;
        const bMat = isGhostAvatar ? ghostBoneMaterial : skeletonBoneMaterial;

        fingerData.forEach((f) => {
          const knuckle = new THREE.Object3D();
          knuckle.position.set(f.pos[0], f.pos[1], f.pos[2]);
          knuckle.rotation.set(f.rot[0], f.rot[1], f.rot[2]);
          wristObj.add(knuckle);

          // Draw palm skeleton bone (from wrist origin to knuckle base position)
          const start = new THREE.Vector3(0, 0, 0);
          const end = new THREE.Vector3(f.pos[0], f.pos[1], f.pos[2]);
          const dir = new THREE.Vector3().subVectors(end, start);
          const dist = dir.length();
          const palmBoneGeo = new THREE.CylinderGeometry(0.005, 0.004, dist, 6);
          palmBoneGeo.translate(0, dist / 2, 0);
          const palmBoneMesh = new THREE.Mesh(palmBoneGeo, bMat);
          palmBoneMesh.position.copy(start);
          palmBoneMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
          wristObj.add(palmBoneMesh);

          if (!isGhostAvatar) {
            // Character skin finger visual mesh
            const fingerGeo = new THREE.CylinderGeometry(f.rad * 0.8, f.rad, f.len, 8);
            fingerGeo.translate(0, -f.len / 2, 0);
            const fingerMesh = new THREE.Mesh(fingerGeo, skinMaterial);
            knuckle.add(fingerMesh);

            const tipGeo = new THREE.SphereGeometry(f.rad * 0.8, 8, 8);
            const tipMesh = new THREE.Mesh(tipGeo, skinMaterial);
            tipMesh.position.set(0, -f.len, 0);
            knuckle.add(tipMesh);
          }

          // Glowing Skeleton joints
          const sj = new THREE.Mesh(new THREE.SphereGeometry(isGhostAvatar ? 0.010 : 0.007, 8, 8), jMat);
          knuckle.add(sj);

          const sbGeo = new THREE.CylinderGeometry(0.004, 0.003, f.len, 6);
          sbGeo.translate(0, -f.len / 2, 0);
          const sbMesh = new THREE.Mesh(sbGeo, bMat);
          knuckle.add(sbMesh);

          const st = new THREE.Mesh(new THREE.SphereGeometry(isGhostAvatar ? 0.008 : 0.005, 8, 8), jMat);
          st.position.set(0, -f.len, 0);
          knuckle.add(st);
        });
      };

      addFingers(leftWrist, false, isGhost);
      addFingers(rightWrist, true, isGhost);

      return {
        group,
        leftShoulder,
        leftElbow,
        leftWrist,
        rightShoulder,
        rightElbow,
        rightWrist,
        head,
      };
    };

    // Instantiate main and ghost hierarchies
    const avatar = buildHierarchy(false);
    const ghost = buildHierarchy(true);

    jointsRef.current = avatar;
    ghostJointsRef.current = ghost;

    // Shift groups down and scale appropriately
    avatar.group.position.y = -0.35;
    ghost.group.position.y = -0.35;
    avatar.group.scale.set(1.5, 1.5, 1.5);
    ghost.group.scale.set(1.5, 1.5, 1.5);

    scene.add(avatar.group);
    scene.add(ghost.group);

    // Initial Idle Pose
    const applyRotationsImmediate = (
      joints: typeof jointsRef.current,
      rot: Required<JointRotations>
    ) => {
      if (!joints) return;
      Object.entries(rot).forEach(([jointName, angles]) => {
        const joint = joints[jointName as keyof typeof joints];
        if (joint) {
          joint.rotation.set(angles.x, angles.y, angles.z);
        }
      });
    };
    applyRotationsImmediate(jointsRef.current, targetRotationsRef.current);
    applyRotationsImmediate(ghostJointsRef.current, targetRotationsRef.current);

    // 4. Animation loop variables
    let clock = new THREE.Clock();
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const speedMultiplier = signingSpeed;

      // Handle translation queue
      if (currentItemRef.current === null && queueRef.current.length > 0) {
        // Take next item
        const next = queueRef.current.shift()!;
        currentItemRef.current = next;
        currentKeyframeIdxRef.current = 0;
        keyframeTimerRef.current = 0;

        if (next.type === 'word') {
          const gestureName = next.val;
          const kfs = GESTURES[gestureName];
          if (kfs && kfs.length > 0) {
            keyframeDurationRef.current = kfs[0].duration;
            onStatusChange?.(`Signing word: ${gestureName.toUpperCase()}`);
          }
        } else {
          // fingerspell letter
          const char = next.val;
          const charCode = char.charCodeAt(0);
          // programmatically generate target hand rotation details for letter
          targetRotationsRef.current.rightShoulder = { x: 0.6, y: -0.4, z: 0.35 };
          targetRotationsRef.current.rightElbow = { x: 1.25, y: 0.05, z: -0.1 };
          targetRotationsRef.current.rightWrist = {
            x: -0.35 + (charCode % 5) * 0.18,
            y: -0.3 + ((charCode >> 1) % 5) * 0.15,
            z: -0.2 + ((charCode >> 2) % 5) * 0.12,
          };
          // reset left hand to idle
          targetRotationsRef.current.leftShoulder = GESTURES.idle[0].rotations.leftShoulder!;
          targetRotationsRef.current.leftElbow = GESTURES.idle[0].rotations.leftElbow!;
          targetRotationsRef.current.leftWrist = GESTURES.idle[0].rotations.leftWrist!;

          keyframeDurationRef.current = 280; // short letters
          onStatusChange?.(`Spelling: ${char.toUpperCase()}`);
        }
      }

      // Progress current gesture keyframe
      if (currentItemRef.current !== null) {
        keyframeTimerRef.current += delta * 1000 * speedMultiplier;

        // Apply targets based on current keyframe
        if (currentItemRef.current.type === 'word') {
          const word = currentItemRef.current.val;
          const kfs = GESTURES[word];
          if (kfs && kfs.length > 0) {
            const currentKf = kfs[currentKeyframeIdxRef.current];

            // Set targets from keyframe
            Object.entries(currentKf.rotations).forEach(([jointName, rot]) => {
              if (rot) {
                targetRotationsRef.current[jointName as keyof JointRotations] = { ...rot };
              }
            });

            // Transition to next keyframe or finish word
            if (keyframeTimerRef.current >= keyframeDurationRef.current) {
              keyframeTimerRef.current = 0;
              if (currentKeyframeIdxRef.current < kfs.length - 1) {
                currentKeyframeIdxRef.current++;
                keyframeDurationRef.current = kfs[currentKeyframeIdxRef.current].duration;
              } else {
                // Word gesture finished
                currentItemRef.current = null;
                onStatusChange?.('Idle');
              }
            }
          } else {
            currentItemRef.current = null;
          }
        } else {
          // fingerspelling letter duration complete
          if (keyframeTimerRef.current >= keyframeDurationRef.current) {
            currentItemRef.current = null;
            onStatusChange?.('Idle');
          }
        }
      } else {
        // Return to Idle Pose targets
        Object.entries(GESTURES.idle[0].rotations).forEach(([jointName, rot]) => {
          if (rot) {
            targetRotationsRef.current[jointName as keyof JointRotations] = { ...rot };
          }
        });
      }

      // 5. Interpolate (lerp) joints towards targets
      const mainLerpFactor = 0.22; // Quick responsive movement
      const joints = jointsRef.current;
      if (joints) {
        Object.entries(targetRotationsRef.current).forEach(([jointName, targetAngle]) => {
          const joint = joints[jointName as keyof typeof joints];
          if (joint) {
            joint.rotation.x = THREE.MathUtils.lerp(joint.rotation.x, targetAngle.x, mainLerpFactor);
            joint.rotation.y = THREE.MathUtils.lerp(joint.rotation.y, targetAngle.y, mainLerpFactor);
            joint.rotation.z = THREE.MathUtils.lerp(joint.rotation.z, targetAngle.z, mainLerpFactor);
          }
        });

        // Add subtle natural body swaying
        const time = clock.getElapsedTime();
        joints.head.rotation.y += Math.sin(time * 1.5) * 0.0006;
        joints.head.rotation.x += Math.cos(time * 1.0) * 0.0004;
      }

      // 6. Ghost skeleton trails (motion blur effect with slow lag)
      const ghostJoints = ghostJointsRef.current;
      const ghostLerpFactor = 0.07; // Much slower lerp creates the ghosting trail!
      if (ghostJoints && joints) {
        Object.keys(ghostJoints).forEach((jointName) => {
          const ghostJoint = ghostJoints[jointName as keyof typeof ghostJoints];
          const mainJoint = joints[jointName as keyof typeof joints];
          if (ghostJoint && mainJoint) {
            ghostJoint.rotation.x = THREE.MathUtils.lerp(
              ghostJoint.rotation.x,
              mainJoint.rotation.x,
              ghostLerpFactor
            );
            ghostJoint.rotation.y = THREE.MathUtils.lerp(
              ghostJoint.rotation.y,
              mainJoint.rotation.y,
              ghostLerpFactor
            );
            ghostJoint.rotation.z = THREE.MathUtils.lerp(
              ghostJoint.rotation.z,
              mainJoint.rotation.z,
              ghostLerpFactor
            );
          }
        });
      }

      // Pulse animation for skeleton elements
      const pulseTime = clock.getElapsedTime();
      const pulseScale = 1.0 + 0.07 * Math.sin(pulseTime * 6.0);
      avatar.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material === skeletonJointMaterial) {
            child.scale.setScalar(pulseScale);
          } else if (child.material === skeletonBoneMaterial) {
            // Keep length scale, update thickness scale
            child.scale.set(pulseScale, 1.0, pulseScale);
          }
        }
      });

      camera.lookAt(0, 0.45, 0);
      renderer.render(scene, camera);
    };
    animate();

    // 7. Resize handler
    const onWindowResize = () => {
      if (!rendererRef.current) return;
      const width = container.clientWidth || 400;
      const height = container.clientHeight || 400;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(width, height);
    };
    window.addEventListener('resize', onWindowResize);

    // Clean up
    return () => {
      window.removeEventListener('resize', onWindowResize);
      cancelAnimationFrame(animFrameId);
      if (rendererRef.current && container.contains(rendererRef.current.domElement)) {
        container.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, [signingSpeed]); // Re-init on speed change keeps timers consistent

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '420px',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label="3D Avatar Canvas"
    />
  );
}
