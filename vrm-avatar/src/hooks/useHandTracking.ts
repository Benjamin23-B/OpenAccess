import { useEffect, useState, useRef, RefObject } from 'react';
import * as mpHands from '@mediapipe/hands';
import * as mpCamera from '@mediapipe/camera_utils';

// Resolve non-standard CJS modules dynamically in Vite/ESM build pathways
const Hands = (mpHands as any).default?.Hands || (mpHands as any).Hands || (window as any).Hands;
const Camera = (mpCamera as any).default?.Camera || (mpCamera as any).Camera || (window as any).Camera;

export interface Landmark {
  x: number;
  y: number;
  z: number;
  confidence: number;
}

export function useHandTracking(videoRef: RefObject<HTMLVideoElement | null>) {
  const [leftHand, setLeftHand] = useState<Landmark[] | null>(null);
  const [rightHand, setRightHand] = useState<Landmark[] | null>(null);
  const [isDetected, setIsDetected] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(0);

  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  
  // FPS tracker states
  const frameCountRef = useRef<number>(0);
  const lastFpsUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!videoRef || !videoRef.current) {
      setLeftHand(null);
      setRightHand(null);
      setIsDetected(false);
      return;
    }

    // 1. Initialize MediaPipe Hands instance
    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.60,
      minTrackingConfidence: 0.60
    });

    // 2. Set up listener to process landmark coordinates
    hands.onResults((results: any) => {
      // FPS calculation
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFpsUpdateRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFpsUpdateRef.current)));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      let lHand: Landmark[] | null = null;
      let rHand: Landmark[] | null = null;
      let detected = false;

      if (results.multiHandLandmarks && results.multiHandedness) {
        detected = true;
        results.multiHandLandmarks.forEach((landmarks, index) => {
          const handedness = results.multiHandedness[index];
          const confidence = handedness.score; // Confidence score
          const label = handedness.label; // "Left" or "Right"

          // Normalize coordinates (MediaPipe provides coordinates from 0.0 to 1.0)
          const normalized: Landmark[] = landmarks.map((lm) => ({
            x: lm.x,
            y: lm.y,
            z: lm.z,
            confidence: confidence,
          }));

          // Assign to left or right hand arrays (consisting of 21 landmarks each)
          if (label === 'Left') {
            lHand = normalized;
          } else if (label === 'Right') {
            rHand = normalized;
          }
        });
      }

      setLeftHand(lHand);
      setRightHand(rHand);
      setIsDetected(detected);
    });

    handsRef.current = hands;

    // 3. Setup Camera stream loop targets
    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current && handsRef.current) {
          try {
            await handsRef.current.send({ image: videoRef.current });
          } catch (e) {
            // Ignore frame drops
          }
        }
      },
      width: 640,
      height: 480
    });

    camera.start()
      .then(() => {
        cameraRef.current = camera;
        lastFpsUpdateRef.current = performance.now();
      })
      .catch((err) => {
        console.error("MediaPipe Camera initialization failed:", err);
      });

    // Clean up
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      if (handsRef.current) {
        handsRef.current.close();
        handsRef.current = null;
      }
    };
  }, [videoRef]);

  return {
    leftHand,
    rightHand,
    isDetected,
    fps,
  };
}
