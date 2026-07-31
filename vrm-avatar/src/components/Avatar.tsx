import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRM } from '@pixiv/three-vrm';
import * as THREE from 'three';
import { RealTimeAnimationEngine } from '../utils/RealTimeAnimationEngine.ts';
import { GestureMapper } from '../utils/GestureMapper.ts';

// Helper function to create line meshes for the bone overlays
function createLineMesh() {
  const geometry = new THREE.BufferGeometry();
  // Pre-allocate buffer for up to 3 points (shoulder -> elbow -> wrist)
  const positions = new Float32Array(3 * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ 
    color: '#4ade80', 
    transparent: true, 
    opacity: 0.85, 
    linewidth: 3 
  });
  return new THREE.Line(geometry, material);
}

// Helper function to update line mesh positions dynamically in render frames
function updateLine(lineMesh: THREE.Line | null, points: THREE.Vector3[]) {
  if (!lineMesh || !points) return;
  const positions = lineMesh.geometry.attributes.position.array as Float32Array;
  
  points.forEach((pt, idx) => {
    positions[idx * 3] = pt.x;
    positions[idx * 3 + 1] = pt.y;
    positions[idx * 3 + 2] = pt.z;
  });
  
  // Fill the third point coordinate with the second point if it is a 2-point connection
  if (points.length === 2) {
    positions[6] = points[1].x;
    positions[7] = points[1].y;
    positions[8] = points[1].z;
  }
  
  lineMesh.geometry.attributes.position.needsUpdate = true;
}

// 1. Dynamic VRM Skeletal Overlay tracing joints at 60 FPS
function VrmSkeletalOverlay({ vrm }: { vrm: VRM }) {
  const groupRef = useRef<THREE.Group>(null);
  const jointRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lineRefs = useRef<(THREE.Line | null)[]>([]);

  useFrame(() => {
    if (!vrm || !vrm.humanoid || !groupRef.current) return;

    // Standard skeletal joints to trace (Right arm + knuckle centers)
    const joints = [
      vrm.humanoid.getNormalizedBoneNode('rightUpperArm'),     // 0: shoulder
      vrm.humanoid.getNormalizedBoneNode('rightLowerArm'),     // 1: elbow
      vrm.humanoid.getNormalizedBoneNode('rightHand'),         // 2: wrist
      vrm.humanoid.getNormalizedBoneNode('rightThumbIntermediate'), // 3: thumb
      vrm.humanoid.getNormalizedBoneNode('rightIndexIntermediate'), // 4: index
      vrm.humanoid.getNormalizedBoneNode('rightMiddleIntermediate'), // 5: middle
      vrm.humanoid.getNormalizedBoneNode('rightRingIntermediate'),  // 6: ring
      vrm.humanoid.getNormalizedBoneNode('rightLittleIntermediate')  // 7: pinky
    ];

    // Compute relative local positions
    const positions = joints.map((node) => {
      const pos = new THREE.Vector3();
      if (node && groupRef.current) {
        node.getWorldPosition(pos);
        groupRef.current.worldToLocal(pos);
      }
      return pos;
    });

    // Update joint sphere meshes
    positions.forEach((pos, idx) => {
      if (jointRefs.current[idx]) {
        jointRefs.current[idx]!.position.copy(pos);
      }
    });

    // Update lines connecting arm and fingers
    updateLine(lineRefs.current[0], [positions[0], positions[1], positions[2]]); // Arm
    updateLine(lineRefs.current[1], [positions[2], positions[3]]); // Thumb
    updateLine(lineRefs.current[2], [positions[2], positions[4]]); // Index
    updateLine(lineRefs.current[3], [positions[2], positions[5]]); // Middle
    updateLine(lineRefs.current[4], [positions[2], positions[6]]); // Ring
    updateLine(lineRefs.current[5], [positions[2], positions[7]]); // Little
  });

  return (
    <group ref={groupRef}>
      {/* Knuckle and Joint Spheres */}
      {Array.from({ length: 8 }).map((_, idx) => (
        <mesh key={idx} ref={(el) => { jointRefs.current[idx] = el; }}>
          <sphereGeometry args={[idx < 3 ? 0.026 : 0.016, 12, 12]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.9} />
        </mesh>
      ))}

      {/* Connection Lines */}
      {Array.from({ length: 6 }).map((_, idx) => (
        <primitive 
          key={idx}
          object={createLineMesh()}
          ref={(el: THREE.Line) => { lineRefs.current[idx] = el; }}
        />
      ))}
    </group>
  );
}

// 2. Main Avatar Component
export default function Avatar({ 
  url = '/assets/avatar.vrm', 
  gestureState, 
  breathingSpeed = 1.0, 
  autoBlink = true,
  leftHandLandmarks = null,
  rightHandLandmarks = null
}) {
  const [vrm, setVrm] = useState<VRM | null>(null);
  const realTimeEngineRef = useRef<RealTimeAnimationEngine | null>(null);
  const gestureMapperRef = useRef<GestureMapper | null>(null);
  
  // Cache of bone nodes to avoid expensive traversal in the 60fps render loop
  const bonesRef = useRef<{ [name: string]: THREE.Object3D | null }>({});

  // State refs for facial animations
  const nextBlinkTimeRef = useRef(3.0);
  const blinkProgressRef = useRef(0.0);
  const lastSaccadeTimeRef = useRef(0.0);
  const saccadeIntervalRef = useRef(2.0);
  const targetEyeRotRef = useRef({ x: 0, y: 0 });
  
  const currentHappyRef = useRef(0.0);
  const targetHappyRef = useRef(0.0);

  // Load the VRM model and register parser plugins
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser));
  });

  useEffect(() => {
    if (gltf && gltf.userData.vrm) {
      const vrmInstance = gltf.userData.vrm as VRM;
      
      // Face forward (180 deg) and center chest/half-body in Apple demo layout
      vrmInstance.scene.rotation.y = Math.PI;
      vrmInstance.scene.position.set(0, -0.82, 0);
      
      // Enable high-quality shadows for meshes and configure SSS skin tone approximations
      vrmInstance.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
          if (obj.material) {
            const mat = obj.material as THREE.MeshStandardMaterial;
            mat.shadowSide = THREE.DoubleSide;
            
            const matName = mat.name.toLowerCase();
            const meshName = obj.name.toLowerCase();
            const isSkin = matName.includes('skin') || 
                           matName.includes('face') || 
                           matName.includes('body') ||
                           meshName.includes('skin') ||
                           meshName.includes('face') ||
                           meshName.includes('body') ||
                           meshName.includes('hand') ||
                           meshName.includes('finger') ||
                           meshName.includes('head');

             if (isSkin) {
              mat.color = new THREE.Color('#ffffff');
              mat.roughness = 0.45;
              mat.metalness = 0.05;
              mat.emissive = new THREE.Color('#ffffff');
              mat.emissiveIntensity = 0.03;
            }
          }
        }
      });

      // Cache humanoid bone nodes for instant lookup in animation ticks
      if (vrmInstance.humanoid) {
        const boneList = [
          'chest', 'spine', 'neck', 'head',
          'leftUpperArm', 'leftLowerArm', 'leftHand',
          'rightUpperArm', 'rightLowerArm', 'rightHand',
          'leftEye', 'rightEye',
          // Finger bones
          'leftThumbProximal', 'leftThumbIntermediate', 'leftThumbDistal',
          'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
          'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
          'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
          'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
          'rightThumbProximal', 'rightThumbIntermediate', 'rightThumbDistal',
          'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
          'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
          'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
          'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal'
        ];

        const cached: { [name: string]: THREE.Object3D | null } = {};
        boneList.forEach((name) => {
          cached[name] = vrmInstance.humanoid!.getNormalizedBoneNode(name as any);
        });
        bonesRef.current = cached;
      }

      // Instantiate the modular controllers
      realTimeEngineRef.current = new RealTimeAnimationEngine(vrmInstance);
      gestureMapperRef.current = new GestureMapper(0.22, true); // smooth mapping, mirrored
      
      setVrm(vrmInstance);
    }
  }, [gltf]);

  // Adjust play speed dynamically
  useEffect(() => {
    if (realTimeEngineRef.current) {
      realTimeEngineRef.current.setSpeed(breathingSpeed);
    }
  }, [breathingSpeed]);

  // Play preset signs on selector adjustments
  useEffect(() => {
    if (!realTimeEngineRef.current) return;
    
    if (gestureState && gestureState !== 'idle') {
      realTimeEngineRef.current.receivePrediction(gestureState, true);
      targetHappyRef.current = 0.85;
    } else {
      realTimeEngineRef.current.clearQueue();
      targetHappyRef.current = 0.15;
    }
  }, [gestureState]);

  // Perform animations on each frame tick
  useFrame((state, delta) => {
    if (!vrm) return;

    // 1. Update VRM internal spring bones and physics
    vrm.update(delta);

    const time = state.clock.getElapsedTime();
    const breathTime = time * breathingSpeed;
    
    const {
      chest,
      spine,
      neck,
      head,
      leftEye,
      rightEye,
      rightLowerArm,
      rightHand
    } = bonesRef.current;

    // Check if hands landmarks are active (Webcam stream override)
    const isTrackingRight = rightHandLandmarks && rightHandLandmarks.length > 0;
    const isTrackingLeft = leftHandLandmarks && leftHandLandmarks.length > 0;
    const isWebcamActive = isTrackingRight || isTrackingLeft;

    // 2. Breathing Animation (subtle, soft chest sways) - applied regardless of signs
    if (chest) {
      chest.rotation.x = Math.sin(breathTime * 1.5) * 0.010;
      chest.rotation.z = Math.sin(breathTime * 1.5) * 0.003;
    }
    if (spine) {
      spine.rotation.x = Math.sin(breathTime * 1.5) * 0.004;
    }
    if (neck) {
      neck.rotation.x = THREE.MathUtils.lerp(neck.rotation.x, Math.cos(breathTime * 1.5) * 0.005, 5.0 * delta);
    }
    if (head) {
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, Math.sin(breathTime * 0.7) * 0.012, 5.0 * delta);
    }

    // 3. Smooth Eye Saccadic Movements
    if (time - lastSaccadeTimeRef.current > saccadeIntervalRef.current) {
      lastSaccadeTimeRef.current = time;
      saccadeIntervalRef.current = 2.0 + Math.random() * 3.0;
      
      targetEyeRotRef.current.x = (Math.random() - 0.5) * 0.04;
      targetEyeRotRef.current.y = (Math.random() - 0.5) * 0.06;
    }

    const eyeLerp = 12.0 * delta;
    if (leftEye) {
      leftEye.rotation.x = THREE.MathUtils.lerp(leftEye.rotation.x, targetEyeRotRef.current.x, eyeLerp);
      leftEye.rotation.y = THREE.MathUtils.lerp(leftEye.rotation.y, targetEyeRotRef.current.y, eyeLerp);
    }
    if (rightEye) {
      rightEye.rotation.x = THREE.MathUtils.lerp(rightEye.rotation.x, targetEyeRotRef.current.x, eyeLerp);
      rightEye.rotation.y = THREE.MathUtils.lerp(rightEye.rotation.y, targetEyeRotRef.current.y, eyeLerp);
    }

    // 4. Natural Blinking logic
    if (vrm.expressionManager && autoBlink) {
      let blinkVal = 0;
      if (time > nextBlinkTimeRef.current) {
        blinkProgressRef.current += delta / 0.12;
        if (blinkProgressRef.current >= 1.0) {
          nextBlinkTimeRef.current = time + 3.0 + Math.random() * 3.0;
          blinkProgressRef.current = 0.0;
        }
        blinkVal = Math.sin(blinkProgressRef.current * Math.PI);
      }
      vrm.expressionManager.setValue('blink', blinkVal);
    }

    // 5. Facial Smiles & Idle Blend Shapes
    if (vrm.expressionManager) {
      if (isWebcamActive) {
        targetHappyRef.current = 0.70;
      }
      currentHappyRef.current = THREE.MathUtils.lerp(currentHappyRef.current, targetHappyRef.current, 5.0 * delta);
      vrm.expressionManager.setValue('happy', currentHappyRef.current);
      
      const relaxedVal = 0.10 + Math.sin(breathTime * 0.8) * 0.04;
      vrm.expressionManager.setValue('relaxed', relaxedVal);
      
      const gazeElevation = Math.max(0, Math.sin(breathTime * 1.5)) * 0.03;
      vrm.expressionManager.setValue('lookUp', gazeElevation);
    }

    // 6. Update target rotations
    if (isWebcamActive && gestureMapperRef.current) {
      if (isTrackingRight) {
        const mapped = gestureMapperRef.current.mapLandmarks(rightHandLandmarks, 'right');
        if (mapped) {
          Object.entries(mapped).forEach(([boneName, qTarget]) => {
            const node = bonesRef.current[boneName];
            if (node) {
              node.quaternion.slerp(qTarget, 0.22);
            }
          });
        }
      }
      if (isTrackingLeft) {
        const mapped = gestureMapperRef.current.mapLandmarks(leftHandLandmarks, 'left');
        if (mapped) {
          Object.entries(mapped).forEach(([boneName, qTarget]) => {
            const node = bonesRef.current[boneName];
            if (node) {
              node.quaternion.slerp(qTarget, 0.22);
            }
          });
        }
      }
    } else {
      if (realTimeEngineRef.current) {
        realTimeEngineRef.current.update(delta);
      }
    }

    // 7. Add dynamic visual wave sways on top of keyframe states if waving
    if (gestureState === 'hello' && rightLowerArm && rightHand) {
      rightLowerArm.rotation.y += Math.sin(time * 8.0) * 0.18;
      rightHand.rotation.z += Math.sin(time * 8.0) * 0.10;
    }
  });

  return vrm ? (
    <group>
      <primitive object={vrm.scene} />
      <VrmSkeletalOverlay vrm={vrm} />
    </group>
  ) : null;
}
