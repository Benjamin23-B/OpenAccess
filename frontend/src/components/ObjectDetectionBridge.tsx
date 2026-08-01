'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function ObjectDetectionBridge() {
  const [isConnected, setIsConnected] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [useMockCamera, setUseMockCamera] = useState(false);
  const [highResMode, setHighResMode] = useState(false);
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

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'environment' }
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.7)', padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.75rem' }}>📷</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f3f4f6' }}>Object Detection & Spatial Scene AI</h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#9ca3af' }}>Real-Time Object Detection, OCR & Visual Question Answering</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 0.85rem', borderRadius: '9999px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isConnected ? '#10b981' : '#ef4444', boxShadow: isConnected ? '0 0 10px #10b981' : '0 0 10px #ef4444' }} />
          <span style={{ fontSize: '0.85rem', color: '#f3f4f6', fontWeight: 500 }}>{isConnected ? 'Backend Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Main Grid: Video + Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Video Feed & Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: '#090d16', borderRadius: '20px', border: `2px solid ${isHapticActive ? '#6366f1' : 'rgba(255, 255, 255, 0.1)'}`, overflow: 'hidden', boxShadow: isHapticActive ? '0 0 30px rgba(99, 102, 241, 0.5)' : '0 8px 32px rgba(0,0,0,0.37)', transition: 'all 0.3s ease' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
            <canvas ref={displayCanvasRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

            {/* HUD Overlay */}
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', right: '1rem', display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: '#d1d5db', fontSize: '0.8rem' }}>
                FPS: {fps}
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.75)', padding: '0.4rem 0.8rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', color: useMockCamera ? '#f59e0b' : '#34d399', fontSize: '0.8rem' }}>
                {cameraStatus}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', background: 'rgba(18, 24, 38, 0.75)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={handleToggleNarration}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  border: 'none',
                  background: isNarrating ? 'rgba(16, 185, 129, 0.2)' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                  color: isNarrating ? '#34d399' : 'white',
                  boxShadow: isNarrating ? '0 0 12px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(99, 102, 241, 0.35)'
                }}
              >
                {isNarrating ? '⏸ Pause Narration' : '▶ Start Narration'}
              </button>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#9ca3af', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={highResMode}
                onChange={e => setHighResMode(e.target.checked)}
                style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
              />
              High-Res (OCR) Mode
            </label>
          </div>

        </div>

        {/* Right Column: Scene Description Transcript & VQA Prompt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'rgba(18, 24, 38, 0.75)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)', minHeight: '440px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#f3f4f6' }}>Scene Analysis Log</h3>
            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{transcripts.length} entries</span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '300px', paddingRight: '0.25rem' }}>
            {transcripts.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', marginTop: '2rem' }}>
                Click &quot;Start Narration&quot; or ask a question below to detect objects.
              </p>
            ) : (
              transcripts.map(t => (
                <div key={t.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)', borderLeft: '3px solid #6366f1', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.875rem' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '0.25rem' }}>{t.timestamp}</div>
                  <div style={{ color: '#f3f4f6' }}>{t.text}</div>
                </div>
              ))
            )}
          </div>



        </div>

      </div>

    </div>
  );
}
