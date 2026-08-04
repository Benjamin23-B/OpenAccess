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

interface DetectedObject {
  label: string;
  box: [number, number, number, number]; // [x1, y1, x2, y2] in 0-1000 scale
  confidence?: number;
  is_text?: boolean;
}

export default function ObjectDetectionBridge() {
  const [isConnected, setIsConnected] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [useMockCamera, setUseMockCamera] = useState(false);
  const [highResMode, setHighResMode] = useState(false);
  const [resolutionKey, setResolutionKey] = useState<string>(DEFAULT_RESOLUTION);
  const [transcripts, setTranscripts] = useState<Array<{ id: string; text: string; timestamp: string }>>([]);

  // Region-of-interest (ROI) bounding box: when enabled, detection only scans
  // the box the user draws on the feed. Coordinates are in displayed CSS px.
  const [roiEnabled, setRoiEnabled] = useState(false);
  const [roi, setRoi] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawingRoi, setIsDrawingRoi] = useState(false);

  // Real-time detected objects with bounding box coordinates from backend
  const [detectedObjects, setDetectedObjects] = useState<DetectedObject[]>([]);

  const [fps, setFps] = useState<number>(0);
  const [cameraStatus, setCameraStatus] = useState<string>('Camera Off');
  const [isHapticActive, setIsHapticActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const isProcessingFrameRef = useRef<boolean>(false);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const isNarratingRef = useRef<boolean>(false);
  const highResModeRef = useRef<boolean>(false);
  const useMockCameraRef = useRef<boolean>(false);
  const resolutionKeyRef = useRef<string>(DEFAULT_RESOLUTION);
  const roiEnabledRef = useRef(false);
  const roiRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const roiStartRef = useRef<{ x: number; y: number } | null>(null);
  const detectedObjectsRef = useRef<DetectedObject[]>([]);

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

  useEffect(() => {
    roiEnabledRef.current = roiEnabled;
  }, [roiEnabled]);

  useEffect(() => {
    roiRef.current = roi;
  }, [roi]);

  useEffect(() => {
    detectedObjectsRef.current = detectedObjects;
  }, [detectedObjects]);

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

  // ---- Region of Interest (ROI) bounding box ----
  // Maps a box drawn in displayed CSS pixels onto the canvas's native pixels
  const getRoiNativeRect = useCallback(() => {
    const canvas = displayCanvasRef.current;
    const wrapper = videoWrapperRef.current;
    const currentRoi = roiRef.current;
    if (!canvas || !wrapper || !currentRoi) return null;
    if (currentRoi.w <= 0 || currentRoi.h <= 0) return null;

    const rect = wrapper.getBoundingClientRect();
    const nw = canvas.width;
    const nh = canvas.height;
    if (!nw || !nh || rect.width <= 0 || rect.height <= 0) return null;

    const scale = Math.max(rect.width / nw, rect.height / nh);
    const offX = (nw * scale - rect.width) / 2;
    const offY = (nh * scale - rect.height) / 2;

    return {
      x: Math.max(0, (currentRoi.x + offX) / scale),
      y: Math.max(0, (currentRoi.y + offY) / scale),
      w: Math.min(nw, currentRoi.w / scale),
      h: Math.min(nh, currentRoi.h / scale),
    };
  }, []);

  // WebSocket Connection
  useEffect(() => {
    let wsUrl = 'ws://localhost:8889/ws/stream';
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      if (window.location.protocol === 'https:') {
        wsUrl = `${protocol}//${window.location.host}/ws/stream`;
      } else {
        const hostname = window.location.hostname || 'localhost';
        wsUrl = `${protocol}//${hostname}:8889/ws/stream`;
      }
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
          if (msg.type === 'detections') {
            setDetectedObjects(msg.objects || []);
            detectedObjectsRef.current = msg.objects || [];
          } else if (msg.type === 'haptic') {
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
    if (displayCanvasRef.current) {
      displayCanvasRef.current.width = 1280;
      displayCanvasRef.current.height = 720;
    }

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

          // 1. Render Video/Mock Background Frame
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

          // 2. Render Real-Time Bounding Boxes of Detected Objects
          const activeDetections = detectedObjectsRef.current;
          if (activeDetections && activeDetections.length > 0 && isNarratingRef.current) {
            const currentRoiRect = roiEnabledRef.current ? getRoiNativeRect() : null;

            activeDetections.forEach((det, idx) => {
              const [normX1, normY1, normX2, normY2] = det.box;

              let x1: number, y1: number, x2: number, y2: number;
              if (currentRoiRect) {
                // Map normalized coords inside ROI crop back to native canvas
                x1 = currentRoiRect.x + (normX1 / 1000) * currentRoiRect.w;
                y1 = currentRoiRect.y + (normY1 / 1000) * currentRoiRect.h;
                x2 = currentRoiRect.x + (normX2 / 1000) * currentRoiRect.w;
                y2 = currentRoiRect.y + (normY2 / 1000) * currentRoiRect.h;
              } else {
                // Full frame mapping
                x1 = (normX1 / 1000) * w;
                y1 = (normY1 / 1000) * h;
                x2 = (normX2 / 1000) * w;
                y2 = (normY2 / 1000) * h;
              }

              const boxW = Math.max(10, x2 - x1);
              const boxH = Math.max(10, y2 - y1);

              const colorPalette = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];
              const mainColor = det.is_text ? '#F59E0B' : colorPalette[idx % colorPalette.length];

              // Draw bounding box border
              ctx.strokeStyle = mainColor;
              ctx.lineWidth = 3;
              ctx.strokeRect(x1, y1, boxW, boxH);

              // Translucent fill for high visibility
              ctx.fillStyle = mainColor + '22';
              ctx.fillRect(x1, y1, boxW, boxH);

              // Label badge header
              const labelStr = `${det.is_text ? 'TEXT' : det.label} (${Math.round((det.confidence || 0.9) * 100)}%)`;
              ctx.font = 'bold 13px sans-serif';
              const textWidth = ctx.measureText(labelStr).width;
              const badgeW = textWidth + 16;
              const badgeH = 22;
              const badgeY = y1 - badgeH >= 0 ? y1 - badgeH : y1;

              ctx.fillStyle = mainColor;
              ctx.fillRect(x1, badgeY, badgeW, badgeH);

              ctx.fillStyle = '#FFFFFF';
              ctx.fillText(labelStr, x1 + 8, badgeY + 15);
            });
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
  }, [setupWebcam, getRoiNativeRect]);

  const getLocalPoint = (clientX: number, clientY: number) => {
    const el = videoWrapperRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleRoiPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!roiEnabledRef.current) return;
    e.preventDefault();
    const p = getLocalPoint(e.clientX, e.clientY);
    if (!p) return;
    roiStartRef.current = p;
    setRoi({ x: p.x, y: p.y, w: 0, h: 0 });
    setIsDrawingRoi(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleRoiPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawingRoi || !roiStartRef.current) return;
    const p = getLocalPoint(e.clientX, e.clientY);
    if (!p) return;
    const rect = videoWrapperRef.current?.getBoundingClientRect();
    const maxX = rect?.width ?? p.x;
    const maxY = rect?.height ?? p.y;
    const start = roiStartRef.current;
    const x = Math.max(0, Math.min(start.x, p.x, maxX));
    const y = Math.max(0, Math.min(start.y, p.y, maxY));
    const w = Math.min(Math.abs(p.x - start.x), maxX - x);
    const h = Math.min(Math.abs(p.y - start.y), maxY - y);
    setRoi({ x, y, w, h });
  };

  const handleRoiPointerUp = () => {
    if (!isDrawingRoi) return;
    setIsDrawingRoi(false);
    roiStartRef.current = null;
    setRoi(prev => (prev && (prev.w < 25 || prev.h < 25) ? null : prev));
  };

  const setPresetRoi = (preset: 'center' | 'top' | 'bottom') => {
    const wrapper = videoWrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    setRoiEnabled(true);

    if (preset === 'center') {
      const rw = w * 0.5;
      const rh = h * 0.5;
      setRoi({ x: (w - rw) / 2, y: (h - rh) / 2, w: rw, h: rh });
    } else if (preset === 'top') {
      setRoi({ x: w * 0.1, y: h * 0.05, w: w * 0.8, h: h * 0.45 });
    } else if (preset === 'bottom') {
      setRoi({ x: w * 0.1, y: h * 0.5, w: w * 0.8, h: h * 0.45 });
    }
  };

  const calculateZoomFactor = (rw: number, rh: number) => {
    const wrapper = videoWrapperRef.current;
    if (!wrapper || rw <= 0 || rh <= 0) return '1.0';
    const rect = wrapper.getBoundingClientRect();
    const totalArea = rect.width * rect.height;
    const roiArea = rw * rh;
    if (roiArea <= 0) return '1.0';
    const factor = Math.sqrt(totalArea / roiArea);
    return Math.min(10, Math.max(1, factor)).toFixed(1);
  };

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
      const roiRect = roiEnabledRef.current ? getRoiNativeRect() : null;

      let ctx: CanvasRenderingContext2D | null = null;
      if (roiRect) {
        // Scan only the region inside the bounding box.
        const outW = Math.max(1, Math.round(roiRect.w));
        const outH = Math.max(1, Math.round(roiRect.h));
        tempCanvas.width = outW;
        tempCanvas.height = outH;
        ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, roiRect.x, roiRect.y, roiRect.w, roiRect.h, 0, 0, outW, outH);
        }
      } else {
        // Full frame.
        tempCanvas.width = canvas.width || 640;
        tempCanvas.height = canvas.height || 480;
        ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        }
      }

      if (ctx) {
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
  }, [getRoiNativeRect]);

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
    resolutionKeyRef.current = key;
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
      setDetectedObjects([]);
    }
  };

  return (
    <div className="flex flex-col gap-6 md:gap-7 w-full max-w-[1340px] mx-auto p-4 md:p-6 text-[#1E293B] dark:text-[#F8FAFC]">

      {/* Header Banner Card */}
      <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:shadow-md transition-all duration-200 flex items-center justify-between flex-wrap gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#0F4C81]/10 dark:bg-[#3B82F6]/20 rounded-xl">
            <svg className="w-7 h-7 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[24px] font-bold text-[#16324F] dark:text-white tracking-tight">ROI Bounding Box Object Detection</h2>
            <p className="text-[15px] text-[#475569] dark:text-[#CBD5E1] mt-0.5">High-Accuracy Region-of-Interest (ROI) Object Detection & Scene AI</p>
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

          {/* Interactive Video Container with Pointer Drag-to-Draw ROI */}
          <div
            ref={videoWrapperRef}
            onPointerDown={handleRoiPointerDown}
            onPointerMove={handleRoiPointerMove}
            onPointerUp={handleRoiPointerUp}
            className={`relative w-full aspect-video bg-[#16324F] dark:bg-[#0F172A] rounded-2xl overflow-hidden border ${isHapticActive ? 'border-[#0F4C81] dark:border-[#3B82F6] shadow-[0_0_20px_rgba(15,76,129,0.4)]' : 'border-[#D8E2EC] dark:border-[#334155] shadow-sm'} ${roiEnabled ? 'cursor-crosshair select-none' : ''} transition-all duration-200 mb-2`}
          >
            <video ref={videoRef} autoPlay playsInline muted className="hidden" />
            <canvas ref={displayCanvasRef} className="w-full h-full object-cover" />

            {/* HUD Overlay */}
            <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none z-10">
              <div className="flex gap-2">
                <div className="bg-[#16324F]/90 dark:bg-[#0F172A]/90 px-3 py-1 rounded-md border border-white/20 text-[#F8FAFC] text-[13px] font-semibold">
                  FPS: {fps}
                </div>
                {roiEnabled && roi && (
                  <div className="bg-[#10B981]/90 px-3 py-1 rounded-md border border-white/30 text-white text-[13px] font-bold shadow animate-pulse">
                    ⚡ {calculateZoomFactor(roi.w, roi.h)}x ROI Pixel Density Zoom
                  </div>
                )}
              </div>
              <div className={`bg-[#16324F]/90 dark:bg-[#0F172A]/90 px-3 py-1 rounded-md border border-white/20 text-[13px] font-semibold ${useMockCamera ? 'text-[#D97706]' : 'text-[#86EFAC]'}`}>
                {cameraStatus}
              </div>
            </div>

            {/* Interactive Visual ROI Selection Box Overlay */}
            {roiEnabled && roi && (
              <div className="absolute inset-0 pointer-events-none z-20">
                {/* Darkened backdrop outside ROI */}
                <svg className="w-full h-full absolute inset-0">
                  <defs>
                    <mask id="roi-mask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect x={roi.x} y={roi.y} width={roi.w} height={roi.h} fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(15, 23, 42, 0.55)" mask="url(#roi-mask)" />
                </svg>

                {/* High-contrast ROI Selection Bounding Box Frame */}
                <div
                  className="absolute border-2 border-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.6)] rounded-md"
                  style={{
                    left: `${roi.x}px`,
                    top: `${roi.y}px`,
                    width: `${roi.w}px`,
                    height: `${roi.h}px`,
                  }}
                >
                  {/* Corner handles */}
                  <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-[#10B981] rounded-full border-2 border-white" />
                  <div className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#10B981] rounded-full border-2 border-white" />
                  <div className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-[#10B981] rounded-full border-2 border-white" />
                  <div className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-[#10B981] rounded-full border-2 border-white" />

                  {/* Floating Tag */}
                  <div className="absolute -top-8 left-0 bg-[#10B981] text-white text-[12px] font-bold px-2.5 py-0.5 rounded-md shadow-md flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>ROI: {Math.round(roi.w)}×{Math.round(roi.h)}px</span>
                    <span className="bg-black/30 px-1 rounded text-[10px]">{calculateZoomFactor(roi.w, roi.h)}x Boost</span>
                  </div>
                </div>
              </div>
            )}

            {/* Instruction banner when ROI is enabled but not drawn yet */}
            {roiEnabled && !roi && (
              <div className="absolute inset-0 bg-black/30 pointer-events-none flex items-center justify-center z-20">
                <div className="bg-[#0F172A]/90 border border-[#10B981]/50 text-white px-5 py-3 rounded-xl text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-3">
                  <svg className="w-6 h-6 text-[#10B981] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                  </svg>
                  <span>Click & Drag on the camera feed to set Region of Interest (ROI) bounding box</span>
                </div>
              </div>
            )}
          </div>

          {/* ROI & Camera Controls Card */}
          <div className="bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col gap-5 transition-colors duration-200 mb-2">

            {/* Top Toolbar Row */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
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

                {/* ROI Mode Toggle Button */}
                <button
                  onClick={() => {
                    const next = !roiEnabled;
                    setRoiEnabled(next);
                    if (!next) setRoi(null);
                  }}
                  className={`h-[48px] px-5 py-3.5 rounded-xl font-semibold text-[14px] transition-all duration-200 flex items-center gap-2 border shadow-sm cursor-pointer ${roiEnabled ? 'bg-[#10B981] text-white border-[#059669] shadow-[0_0_12px_rgba(16,185,129,0.3)]' : 'bg-[#F1F5F9] dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] border-[#CBD5E1] dark:border-[#334155] hover:bg-[#E2E8F0] dark:hover:bg-[#1E293B]'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  {roiEnabled ? 'ROI Mode Active' : 'Enable ROI Mode'}
                </button>

                {roiEnabled && roi && (
                  <button
                    onClick={() => setRoi(null)}
                    className="h-[48px] px-4 py-3.5 rounded-xl font-medium text-[13px] text-[#DC2626] hover:bg-[#FEE2E2] dark:hover:bg-[#451A1A] border border-[#FCA5A5] dark:border-[#7F1D1D] transition-colors cursor-pointer"
                  >
                    Clear ROI Box
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 flex-wrap">
                <label className="flex items-center gap-2 text-[14px] text-[#1E293B] dark:text-[#F8FAFC] font-semibold">
                  Camera
                  <select
                    value={resolutionKey}
                    onChange={e => handleResolutionChange(e.target.value)}
                    className="bg-white dark:bg-[#0F172A] text-[#1E293B] dark:text-[#F8FAFC] border border-[#CBD5E1] dark:border-[#334155] rounded-lg px-2.5 py-1.5 text-[14px] cursor-pointer"
                  >
                    {Object.entries(CAMERA_RESOLUTIONS).map(([key, res]) => (
                      <option key={key} value={key}>{res.label}</option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-2 text-[14px] text-[#1E293B] dark:text-[#F8FAFC] font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highResMode}
                    onChange={e => setHighResMode(e.target.checked)}
                    className="w-4.5 h-4.5 accent-[#0F4C81] dark:accent-[#3B82F6] rounded border-[#CBD5E1] cursor-pointer"
                  />
                  High-Res (OCR)
                </label>
              </div>
            </div>

            {/* ROI Quick Presets Bar */}
            <div className="flex items-center gap-3 pt-3 border-t border-[#E2E8F0] dark:border-[#334155] flex-wrap">
              <span className="text-[13px] font-semibold text-[#64748B] dark:text-[#94A3B8]">ROI Presets:</span>
              <button
                onClick={() => setPresetRoi('center')}
                className="px-3.5 py-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] border border-[#CBD5E1] dark:border-[#334155] rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
              >
                Center Focus (50%)
              </button>
              <button
                onClick={() => setPresetRoi('top')}
                className="px-3.5 py-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] border border-[#CBD5E1] dark:border-[#334155] rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
              >
                Upper Region
              </button>
              <button
                onClick={() => setPresetRoi('bottom')}
                className="px-3.5 py-1.5 bg-[#F8FAFC] dark:bg-[#0F172A] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] border border-[#CBD5E1] dark:border-[#334155] rounded-lg text-[13px] font-medium transition-colors cursor-pointer"
              >
                Lower Region
              </button>
            </div>

          </div>

        </div>

        {/* Right Column: Scene Description Transcript & Detected Objects Panel */}
        <div className="lg:col-span-4 bg-white dark:bg-[#1E293B] border border-[#D8E2EC] dark:border-[#334155] rounded-2xl p-6 md:p-7 shadow-[0_4px_12px_rgba(15,23,42,0.06)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.35)] flex flex-col gap-5 min-h-[500px] transition-colors duration-200">

          {/* Detections Summary */}
          <div className="border-b border-[#D8E2EC] dark:border-[#334155] pb-4">
            <h3 className="text-[18px] font-bold text-[#16324F] dark:text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ROI Detections
              </span>
              <span className="bg-[#10B981]/15 text-[#10B981] text-[12px] px-2.5 py-0.5 rounded-full font-semibold">
                {detectedObjects.length} Objects
              </span>
            </h3>
            {detectedObjects.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {detectedObjects.map((obj, i) => (
                  <span key={i} className="inline-flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] text-[12px] font-semibold px-2.5 py-1 rounded-md">
                    <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                    {obj.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Scene Analysis Log */}
          <div className="flex justify-between items-center border-b border-[#D8E2EC] dark:border-[#334155] pb-3">
            <h3 className="text-[18px] font-semibold text-[#16324F] dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-[#0F4C81] dark:text-[#3B82F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Scene Analysis Log
            </h3>
            <span className="text-[12px] text-[#64748B] dark:text-[#94A3B8] font-semibold">{transcripts.length} entries</span>
          </div>

          <div className="flex flex-col gap-3 pr-1 overflow-y-auto max-h-[380px]">
            {transcripts.length === 0 ? (
              <p className="text-[14px] text-[#64748B] dark:text-[#94A3B8] text-center my-auto italic py-8">
                Click &quot;Start Narration&quot; or select an ROI bounding box to perform object detection.
              </p>
            ) : (
              transcripts.map(t => (
                <div key={t.id} className="bg-[#F4F7FB] dark:bg-[#0F172A] border border-[#D8E2EC] dark:border-[#334155] border-l-4 border-l-[#0F4C81] dark:border-l-[#3B82F6] p-3.5 rounded-lg text-[14px]">
                  <div className="text-[12px] text-[#64748B] dark:text-[#94A3B8] font-semibold mb-1">{t.timestamp}</div>
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
