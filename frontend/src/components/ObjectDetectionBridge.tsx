'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

// Camera capture resolution presets. Values are "ideal" constraints, so a
// device that can't hit them exactly falls back to its closest supported size.
const CAMERA_RESOLUTIONS: Record<string, { label: string; width: number; height: number }> = {
  low:  { label: '640×480 (Low)',     width: 640,  height: 480 },
  sd:   { label: '854×480 (480p)',    width: 854,  height: 480 },
  hd:   { label: '1280×720 (720p)',   width: 1280, height: 720 },
  fhd:  { label: '1920×1080 (1080p)', width: 1920, height: 1080 },
};
const DEFAULT_RESOLUTION = 'hd';

export default function ObjectDetectionBridge() {
  const [isConnected, setIsConnected] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [useMockCamera, setUseMockCamera] = useState(false);
  const [highResMode, setHighResMode] = useState(false);
  const [resolutionKey, setResolutionKey] = useState<string>(DEFAULT_RESOLUTION);
  const [transcripts, setTranscripts] = useState<Array<{ id: string; text: string; timestamp: string }>>([]);

  const [fps, setFps] = useState<number>(0);
  const [cameraStatus, setCameraStatus] = useState<string>('Camera Off');
  const [isHapticActive, setIsHapticActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const isNarratingRef = useRef<boolean>(false);
  const highResModeRef = useRef<boolean>(false);
  const useMockCameraRef = useRef<boolean>(false);
  const resolutionKeyRef = useRef<string>(DEFAULT_RESOLUTION);

  // Sync refs with state for use inside animation/socket callbacks
  useEffect(() => {
    isNarratingRef.current = isNarrating;
  }, [isNarrating]);

  useEffect(() => {
    highResModeRef.current = highResMode;
  }, [highResMode]);

  useEffect(() => {
    useMockCameraRef.current = useMockCamera;
  }, [useMockCamera]);

  useEffect(() => {
    resolutionKeyRef.current = resolutionKey;
  }, [resolutionKey]);

  const addTranscript = useCallback((text: string) => {
    const time = new Date().toLocaleTimeString();
    setTranscripts(prev => [
      { id: Math.random().toString(36).substring(2, 9), text, timestamp: time },
      ...prev.slice(0, 49) // Keep last 50
    ]);
  }, []);

  const triggerHaptic = useCallback(() => {
    setIsHapticActive(true);
    setTimeout(() => setIsHapticActive(false), 600);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  }, []);

  const speakText = useCallback((text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const clean = text.replace(/<[^>]*>/g, '').trim();
      if (!clean) {
        isProcessingFrameRef.current = false;
        return;
      }

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        setTimeout(() => {
          isProcessingFrameRef.current = false;
        }, 300);
      };

      utterance.onerror = () => {
        isProcessingFrameRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    } else {
      isProcessingFrameRef.current = false;
    }
  }, []);

  // Setup webcam
  const setupWebcam = useCallback(async () => {
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }

      const res = CAMERA_RESOLUTIONS[resolutionKeyRef.current] || CAMERA_RESOLUTIONS[DEFAULT_RESOLUTION];
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: res.width }, height: { ideal: res.height }, facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('autoplay', '');
        videoRef.current.setAttribute('playsinline', '');
        await videoRef.current.play();
        setUseMockCamera(false);
        setCameraStatus('Live Webcam Connected');
      }
    } catch (err) {
      console.warn('Webcam error:', err);
      // Retry once with simpler constraints
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
          setUseMockCamera(false);
          setCameraStatus('Live Webcam Connected');
          return;
        }
      } catch (retryErr) {
        console.warn('Webcam retry also failed:', retryErr);
      }
      setUseMockCamera(true);
      setCameraStatus('Mock Camera (Permission / Device Busy)');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraStatus('Camera Off');
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let wsUrl = 'ws://localhost:8000/ws/stream';
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname || 'localhost';
      wsUrl = `${protocol}//${host}:8000/ws/stream`;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('Object Detection WS connected');
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('Object Detection WS disconnected');
    };

    ws.onerror = (err) => {
      console.error('WS Error:', err);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'haptic') {
            triggerHaptic();
          } else if (msg.type === 'narrative_text') {
            addTranscript(msg.text);
            speakText(msg.text);
          } else if (msg.type === 'audio_end') {
            setTimeout(() => {
              isProcessingFrameRef.current = false;
            }, 300);
          }
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      }
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [addTranscript, speakText, triggerHaptic]);

  // Initial camera setup & render loop
  useEffect(() => {
    // Set initial canvas dimensions so it's not stuck at 300x150
    if (displayCanvasRef.current) {
      displayCanvasRef.current.width = 1280;
      displayCanvasRef.current.height = 720;
    }

    // Camera is not setup on mount anymore. It will be initialized when narration starts.

    let animationFrameId: number;

    const renderLoop = () => {
      const canvas = displayCanvasRef.current;
      const video = videoRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Sync canvas to video resolution once available
          if (video && video.videoWidth > 0 && video.videoHeight > 0) {
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
            }
          }

          const w = canvas.width;
          const h = canvas.height;

          if (!useMockCameraRef.current && video && video.readyState >= video.HAVE_CURRENT_DATA && isNarratingRef.current) {
            ctx.drawImage(video, 0, 0, w, h);
          } else if (useMockCameraRef.current) {
            // Draw Mock Camera Frame
            const time = Date.now() / 1000;
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, w, h);

            const grad = ctx.createLinearGradient(0, 0, w, h);
            grad.addColorStop(0, '#1e1b4b');
            grad.addColorStop(1, '#064e3b');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            const cx = w / 2 + Math.sin(time * 2) * (w / 4);
            const cy = h / 2 + Math.cos(time * 3) * (h / 4);

            ctx.beginPath();
            ctx.arc(cx, cy, 50, 0, Math.PI * 2);
            ctx.fillStyle = '#f59e0b';
            ctx.fill();

            ctx.font = 'bold 32px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('MOCK CAMERA FEED ACTIVE', 50, 90);

            ctx.font = '20px sans-serif';
            ctx.fillStyle = '#a7f3d0';
            ctx.fillText(`Time: ${new Date().toLocaleTimeString()}`, 50, 130);
            ctx.fillText('Connect webcam for live vision processing', 50, 165);
          } else {
            // Waiting for webcam to initialize - show loading state
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(0, 0, w, h);
            ctx.font = 'bold 24px sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.textAlign = 'center';
            ctx.fillText(isNarratingRef.current ? 'Initializing Camera...' : 'Camera Off - Click Start Narration', w / 2, h / 2);
            ctx.textAlign = 'start';
          }
        }
      }

      frameCountRef.current++;
      const now = performance.now();
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(Math.round((frameCountRef.current * 1000) / (now - lastFrameTimeRef.current)));
        frameCountRef.current = 0;
        lastFrameTimeRef.current = now;
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [setupWebcam]);

  // Frame Capture & Send over WS
  const captureAndSendFrame = useCallback((commandStr: string | null = null) => {
    const ws = wsRef.current;
    const canvas = displayCanvasRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || isProcessingFrameRef.current || !canvas) {
      return;
    }

    isProcessingFrameRef.current = true;

    // Safety timeout
    const watchdog = setTimeout(() => {
      isProcessingFrameRef.current = false;
    }, 6000);

    try {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width || 640;
      tempCanvas.height = canvas.height || 480;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.8);
        const base64Data = dataUrl.split(',')[1];

        const payload = {
          image: base64Data,
          high_res_mode: highResModeRef.current,
          command: commandStr
        };

        ws.send(JSON.stringify(payload));
      }
    } catch (e) {
      console.error('Frame capture error:', e);
      isProcessingFrameRef.current = false;
    } finally {
      clearTimeout(watchdog);
    }
  }, []);

  // Interval timer for continuous narration
  useEffect(() => {
    const interval = setInterval(() => {
      if (isNarratingRef.current && !isProcessingFrameRef.current) {
        captureAndSendFrame();
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [captureAndSendFrame]);

  const handleResolutionChange = (key: string) => {
    if (!(key in CAMERA_RESOLUTIONS)) return;
    setResolutionKey(key);
    resolutionKeyRef.current = key; // update ref now so a live restart uses it
    // Re-open the webcam with the new size if narration is already running.
    if (isNarratingRef.current) {
      stopWebcam();
      setCameraStatus('Initializing camera...');
      setupWebcam();
    }
  };

  const handleToggleNarration = async () => {
    const nextState = !isNarrating;
    setIsNarrating(nextState);
    if (nextState) {
      setCameraStatus('Initializing camera...');
      await setupWebcam();
      captureAndSendFrame();
    } else {
      stopWebcam();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      isProcessingFrameRef.current = false;
    }
  };



  return (
    <div className="flex flex-col gap-6 md:gap-7 w-full max-w-[1340px] mx-auto p-4 md:p-6 text-[#1E293B] dark:text-[#F8FAFC]">

      {/* Header Banner Card */}
      <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex items-center justify-between flex-wrap gap-4 mb-2">
        <div className="flex items-center gap-3">
          <svg className="w-7 h-7 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <div>
            <h2 className="text-[24px] font-bold text-[#16324F] dark:text-white tracking-tight">Object Detection & Spatial Scene AI</h2>
            <p className="text-[15px] text-[#475569] dark:text-[#CBD5E1] mt-0.5">Real-Time Object Detection, OCR & Visual Scene Narration</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#F4F7FB] dark:bg-[#0F172A] px-3.5 py-1.5 rounded-full border border-[#D8E2EC] dark:border-[#334155]">
          <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-[#198754] dark:bg-[#16A34A] animate-pulse' : 'bg-[#C0392B] dark:bg-[#DC2626]'}`} />
          <span className="text-[13px] text-[#1E293B] dark:text-[#F8FAFC] font-semibold">{isConnected ? 'Backend Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Main Grid: Video + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-7 items-start">

        {/* Left Column: Video Feed & Controls */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          <div className={`relative w-full aspect-video bg-[#16324F] dark:bg-[#0F172A] rounded-2xl overflow-hidden border ${isHapticActive ? 'border-[#0F4C81] dark:border-[#3B82F6] shadow-[0_0_20px_rgba(15,76,129,0.4)]' : 'border-[#D8E2EC] dark:border-[#334155] shadow-sm'} transition-all duration-200 mb-2`}>
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas ref={displayCanvasRef} className="w-full h-full object-cover" />

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none">
              <div className="bg-[#16324F]/90 dark:bg-[#0F172A]/90 px-3 py-1 rounded-md border border-white/20 text-[#F8FAFC] text-[13px] font-semibold">
                FPS: {fps}
              </div>
              <div className={`bg-[#16324F]/90 dark:bg-[#0F172A]/90 px-3 py-1 rounded-md border border-white/20 text-[13px] font-semibold ${useMockCamera ? 'text-[#D97706]' : 'text-[#86EFAC]'}`}>
                {cameraStatus}
              </div>
            </div>
          </div>

          {/* Controls Bar Card */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex items-center justify-between flex-wrap gap-4 transition-colors duration-200 mb-2">
            <div className="flex gap-4">
              <button
                onClick={handleToggleNarration}
                className={`h-[48px] px-6 py-3.5 rounded-xl font-semibold text-[15px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer flex items-center gap-2 text-white shadow-sm ${isNarrating ? 'bg-[#C0392B] dark:bg-[#DC2626] hover:bg-[#A93226]' : 'bg-[#0F4C81] dark:bg-[#2563EB] hover:bg-[#0B3D66] dark:hover:bg-[#1D4ED8]'
                  }`}
              >
                {isNarrating ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
                    </svg>
                    Pause Narration
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    Start Narration
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-[15px] text-[#1E293B] dark:text-[#F8FAFC] font-semibold">
                Camera
                <select
                  value={resolutionKey}
                  onChange={e => handleResolutionChange(e.target.value)}
                  className="bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-lg px-2.5 py-1.5 text-[15px] cursor-pointer"
                >
                  {Object.entries(CAMERA_RESOLUTIONS).map(([key, res]) => (
                    <option key={key} value={key}>{res.label}</option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-[15px] text-[#1E293B] dark:text-[#F8FAFC] font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={highResMode}
                  onChange={e => setHighResMode(e.target.checked)}
                  className="w-4.5 h-4.5 accent-[#0F4C81] dark:accent-[#3B82F6] rounded border-[#CBD5E1] cursor-pointer"
                />
                High-Res (OCR) Mode
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: Scene Description Transcript & VQA Prompt Card */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col gap-4 min-h-[460px] transition-colors duration-200">

          <div className="flex justify-between items-center border-b border-[#D8E2EC] dark:border-[#334155] pb-3">
            <h3 className="text-[20px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Scene Analysis Log
            </h3>
            <span className="text-[13px] text-[#64748B] dark:text-[#94A3B8] font-semibold">{transcripts.length} entries</span>
          </div>

          <div className="flex flex-col gap-3 pr-1">
            {transcripts.length === 0 ? (
              <p className="text-[15px] text-[#64748B] dark:text-[#94A3B8] text-center my-auto italic">
                Click &quot;Start Narration&quot; or ask a question below to detect objects.
              </p>
            ) : (
              transcripts.map(t => (
                <div key={t.id} className="bg-[#F4F7FB] dark:bg-[#0F172A] border border-[#D8E2EC] dark:border-[#334155] border-l-4 border-l-[#0F4C81] dark:border-l-[#3B82F6] p-3.5 rounded-lg text-[15px]">
                  <div className="text-[13px] text-[#64748B] dark:text-[#94A3B8] font-semibold mb-1">{t.timestamp}</div>
                  <div className="text-[#1E293B] dark:text-[#F8FAFC]">{t.text}</div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
