import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Scene from './components/Scene.tsx';
import GestureController from './components/GestureController.tsx';
import AnimationController from './components/AnimationController.tsx';
import { useHandTracking } from './hooks/useHandTracking.ts';

export default function App() {
  const [gesture, setGesture] = useState('idle');
  const [breathingSpeed, setBreathingSpeed] = useState(1.0);
  const [autoBlink, setAutoBlink] = useState(true);
  const [useWebcam, setUseWebcam] = useState(false);

  // Webcam stream reference for MediaPipe hand tracking integration
  const videoRef = useRef(null);
  const { leftHand, rightHand, isDetected, fps } = useHandTracking(useWebcam ? videoRef : null);

  return (
    <div className="w-screen h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-gray-950 to-black text-white p-4 font-sans select-none overflow-hidden">
      
      {/* Dark Theme Card Container with Framer Motion entry animations */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg bg-gray-900/80 border border-gray-800/80 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center"
      >
        
        {/* Upper 3D Canvas Area */}
        <div className="w-full h-80 bg-gray-950/70 border border-gray-800/60 rounded-2xl overflow-hidden relative">
          <Scene 
            gestureState={gesture} 
            breathingSpeed={breathingSpeed} 
            autoBlink={autoBlink} 
            leftHandLandmarks={leftHand}
            rightHandLandmarks={rightHand}
          />
          
          {/* Status Badges Overlay */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
            <div className="bg-gray-950/80 border border-gray-800/60 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-extrabold text-gray-300 uppercase tracking-widest font-mono">VRM ENGINE ACTIVE</span>
            </div>
            
            {useWebcam && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-950/80 border border-gray-800/60 px-3 py-1.5 rounded-xl flex items-center gap-2"
              >
                <span className={`h-2 w-2 rounded-full ${isDetected ? 'bg-indigo-500 animate-ping' : 'bg-red-500'}`} />
                <span className="text-[9px] font-extrabold text-gray-300 uppercase tracking-widest font-mono">
                  {isDetected ? `TRACKING ACTIVE (${fps} FPS)` : 'WAITING FOR HANDS'}
                </span>
              </motion.div>
            )}
          </div>

          {/* Webcam Mirror Canvas PiP overlay */}
          <video 
            ref={videoRef}
            className={`absolute bottom-3 right-3 w-28 h-20 rounded-lg border border-gray-800/60 bg-black object-cover transform scale-x-[-1] transition-opacity duration-300 ${
              useWebcam ? 'opacity-85' : 'opacity-0 pointer-events-none'
            }`}
            autoPlay
            playsInline
            muted
          />
        </div>

        {/* Captions resembling Apple Sign Language presentation layout */}
        <div className="mt-5 text-center">
          <h2 className="text-xl font-extrabold text-white tracking-wide">
            Sign Language Translation
          </h2>
          <p className="text-xs text-gray-500 mt-1 font-semibold tracking-wide uppercase">
            Webcam gesture recognition module
          </p>
        </div>

        {/* Dynamic Controls row */}
        <div className="w-full flex justify-between gap-4 mt-4 px-2">
          <button
            onClick={() => setUseWebcam(!useWebcam)}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
              useWebcam 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white ring-2 ring-indigo-400' 
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            {useWebcam ? 'Disable Webcam' : 'Enable Webcam Detection'}
          </button>
          
          <button
            onClick={() => {
              setGesture('idle');
              setUseWebcam(false);
            }}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-300 uppercase tracking-wider transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Controller Sub-components with entry transitions */}
        <AnimatePresence mode="wait">
          {!useWebcam && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full overflow-hidden"
            >
              <GestureController currentGesture={gesture} setGesture={setGesture} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <AnimationController 
          breathingSpeed={breathingSpeed} 
          setBreathingSpeed={setBreathingSpeed} 
          autoBlink={autoBlink} 
          setAutoBlink={setAutoBlink} 
        />
        
      </motion.div>
    </div>
  );
}
