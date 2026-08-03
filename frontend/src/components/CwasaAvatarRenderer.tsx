'use client';

import React, { useEffect, useRef, useState } from 'react';
import { sanitizeSigml } from '../services/signDictionaryService';

interface CwasaAvatarRendererProps {
  sigmlText?: string;
  avatarName?: 'anna' | 'marc' | 'francoise' | 'luna' | 'siggi';
  signingSpeed?: number;
  onStatusChange?: (status: string) => void;
}

declare global {
  interface Window {
    CWASA?: any;
    CWASA_READY?: boolean;
    CWASA_INITIALIZED?: boolean;
    CWASA_CANVAS_NODE?: HTMLElement | null;
  }
}

export default function CwasaAvatarRenderer({
  sigmlText = '',
  avatarName = 'anna',
  signingSpeed = 1.0,
  onStatusChange,
}: CwasaAvatarRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [showDebug, setShowDebug] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPlayedSigml = useRef<string>('');

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[CWASA ${timestamp}] ${msg}`;
    console.log(formatted);
    setDebugLogs((prev) => [...prev.slice(-15), formatted]);
  };

  useEffect(() => {
    addLog(`Component mounted. Target avatar: '${avatarName}'`);

    // Check WebGL hardware acceleration
    const checkWebGL = () => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
          addLog('ERROR: WebGL context creation returned null.');
          return false;
        }
        addLog('WebGL Context is available.');
        return true;
      } catch (e: any) {
        addLog(`ERROR testing WebGL: ${e.message}`);
        return false;
      }
    };

    checkWebGL();

    let scriptEl: HTMLScriptElement | null = null;
    let linkEl: HTMLLinkElement | null = null;

    const initCwasaEngine = () => {
      addLog('Checking CWASA DOM canvas binding...');
      const avContainer = containerRef.current?.querySelector('.CWASAAvatar') as HTMLElement;
      if (!avContainer) {
        addLog('ERROR: .CWASAAvatar element not found inside containerRef.');
        return;
      }

      // Check if canvas already exists inside our current container
      let hasCanvas = avContainer.querySelector('canvas') || avContainer.querySelector('.divAv');

      // Check if an existing CWASA canvas exists in window or document body (from a previous mount)
      if (!hasCanvas) {
        const globalCanvas = window.CWASA_CANVAS_NODE || document.querySelector('.divAv') || document.querySelector('.CWASAAvatar canvas');
        if (globalCanvas && globalCanvas.parentElement !== avContainer) {
          addLog('Found existing CWASA canvas node in document! Re-parenting to active container...');
          avContainer.appendChild(globalCanvas);
          hasCanvas = globalCanvas as any;
          window.CWASA_CANVAS_NODE = globalCanvas as any;
        }
      }

      if (!window.CWASA_INITIALIZED || !hasCanvas) {
        window.CWASA_INITIALIZED = true;
        try {
          addLog(`Initializing window.CWASA with initAv='${avatarName}'...`);
          window.CWASA.init({
            jasBase: '/cwa/',
            cwaBase: '/cwa/',
            sigmlBase: 'sigml',
            avJARBase: 'avatars',
            useClientConfig: false,
            useCwaConfig: false,
            avSettings: [
              {
                width: 512,
                height: 384,
                avList: 'avs',
                initAv: (Boolean(avatarName) && (avatarName as string) !== 'null') ? avatarName : 'anna',
                initCamera: [0, 0.23, 3.24, 5, 18, 30, -1, -1],
                ambIdle: true,
                allowFrameSteps: false,
                allowSiGMLText: true,
              },
            ],
          });
          addLog('CWASA.init() executed.');

          // Store reference to created canvas container
          setTimeout(() => {
            const createdNode = avContainer.querySelector('.divAv') || avContainer.querySelector('canvas');
            if (createdNode) {
              window.CWASA_CANVAS_NODE = createdNode as HTMLElement;
              addLog(`Saved CWASA canvas reference (${createdNode.tagName}).`);
            } else {
              addLog('WARNING: .divAv / canvas element not found immediately after init.');
            }
          }, 300);
        } catch (e: any) {
          addLog(`EXCEPTION during CWASA.init(): ${e.message}`);
          console.error('CWASA init exception:', e);
        }
      } else {
        addLog('CWASA canvas is attached and active in container.');
      }

      if (window.CWASA.ready && typeof window.CWASA.ready.then === 'function') {
        window.CWASA.ready
          .then(() => {
            addLog('window.CWASA.ready resolved successfully!');
            setIsLoaded(true);
            setErrorMsg(null);
            onStatusChange?.('Kozha 3D Avatar Ready');
          })
          .catch((err: any) => {
            addLog(`WARNING: window.CWASA.ready rejected: ${err}`);
            setIsLoaded(true);
          });
      } else {
        addLog('CWASA engine ready flag set.');
        setIsLoaded(true);
        onStatusChange?.('Kozha 3D Avatar Ready');
      }
    };

    const loadAssets = () => {
      if (!document.getElementById('cwasa-css')) {
        addLog('Injecting /cwa/cwasa.css...');
        linkEl = document.createElement('link');
        linkEl.id = 'cwasa-css';
        linkEl.rel = 'stylesheet';
        linkEl.href = '/cwa/cwasa.css';
        document.head.appendChild(linkEl);
      }

      // Intercept uncaught CWASA WebGL viewport errors gracefully
      const handleGlobalError = (event: ErrorEvent) => {
        if (event?.message?.includes('viewport') || event?.message?.includes('Context Lost') || event?.filename?.includes('allcsa.js')) {
          addLog(`Global Error Intercepted: ${event.message}`);
          event.preventDefault();
          setIsLoaded(true);
        }
      };
      window.addEventListener('error', handleGlobalError);

      if (window.CWASA && typeof window.CWASA.init === 'function') {
        addLog('window.CWASA already loaded in window.');
        setTimeout(initCwasaEngine, 100);
        return () => {
          window.removeEventListener('error', handleGlobalError);
        };
      }

      const existingScript = document.getElementById('cwasa-js') as HTMLScriptElement;
      if (existingScript) {
        addLog('cwasa-js script tag exists; polling window.CWASA...');
        const poll = setInterval(() => {
          if (window.CWASA && typeof window.CWASA.init === 'function') {
            addLog('window.CWASA ready from script tag!');
            clearInterval(poll);
            initCwasaEngine();
          }
        }, 150);
        return () => {
          clearInterval(poll);
          window.removeEventListener('error', handleGlobalError);
        };
      }

      addLog('Loading /cwa/allcsa.js script...');
      scriptEl = document.createElement('script');
      scriptEl.id = 'cwasa-js';
      scriptEl.src = '/cwa/allcsa.js';
      scriptEl.async = true;

      scriptEl.onload = () => {
        addLog('/cwa/allcsa.js loaded successfully!');
        let attempts = 0;
        const check = setInterval(() => {
          attempts++;
          if (window.CWASA && typeof window.CWASA.init === 'function') {
            addLog(`CWASA engine object ready on attempt ${attempts}!`);
            clearInterval(check);
            initCwasaEngine();
          } else if (attempts > 50) {
            addLog('ERROR: Polling window.CWASA timed out.');
            clearInterval(check);
            setIsLoaded(true);
          }
        }, 100);
      };

      scriptEl.onerror = () => {
        addLog('ERROR: Failed to load /cwa/allcsa.js.');
        setErrorMsg('Failed to load Kozha 3D Avatar script (/cwa/allcsa.js)');
        onStatusChange?.('Engine Error');
      };

      document.body.appendChild(scriptEl);

      return () => {
        window.removeEventListener('error', handleGlobalError);
      };
    };

    const cleanup = loadAssets();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  const playTimerRef = useRef<any>(null);

  // Play SiGML whenever sigmlText updates
  useEffect(() => {
    if (!sigmlText || sigmlText === lastPlayedSigml.current || !isLoaded) return;
    lastPlayedSigml.current = sigmlText;

    addLog(`Received SiGML update (${sigmlText.length} chars). Parsing signs...`);
    const signMatches = sigmlText.match(/<hns_sign[\s\S]*?<\/hns_sign>/gi);
    if (!signMatches || signMatches.length === 0) {
      addLog('No <hns_sign> tags found in SiGML.');
      return;
    }

    addLog(`Found ${signMatches.length} sign(s) to play.`);
    if (playTimerRef.current) {
      clearTimeout(playTimerRef.current);
    }

    let index = 0;

    const playNextSign = () => {
      if (index >= signMatches.length) {
        addLog('Playback sequence completed.');
        onStatusChange?.('Kozha 3D Avatar Ready');
        return;
      }

      const singleSigml = sanitizeSigml(`<?xml version="1.0" encoding="utf-8"?>\n<sigml>\n${signMatches[index]}\n</sigml>`);
      const glossMatch = signMatches[index].match(/gloss="([^"]+)"/i);
      const gloss = glossMatch ? glossMatch[1] : `Sign ${index + 1}`;
      
      addLog(`Playing sign ${index + 1}/${signMatches.length}: '${gloss}'`);
      onStatusChange?.(`Signing (${index + 1}/${signMatches.length}): ${gloss}`);

      if (window.CWASA && typeof window.CWASA.playSiGMLText === 'function') {
        try {
          window.CWASA.playSiGMLText(singleSigml, 0);
        } catch (e: any) {
          addLog(`WARNING during playSiGMLText: ${e.message}`);
        }
      } else {
        addLog('WARNING: window.CWASA.playSiGMLText not available.');
      }

      index++;
      const delay = Math.max(900, Math.round(1400 / (signingSpeed || 1.0)));
      playTimerRef.current = setTimeout(playNextSign, delay);
    };

    playNextSign();

    return () => {
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
      }
    };
  }, [sigmlText, isLoaded, signingSpeed, onStatusChange]);

  // Switch avatar if requested
  useEffect(() => {
    if (!avatarName || (avatarName as string) === 'null' || !isLoaded) return;
    addLog(`Switching avatar character to '${avatarName}'...`);
    if (window.CWASA && typeof window.CWASA.setAvatar === 'function') {
      try {
        window.CWASA.setAvatar(avatarName, 0);
      } catch (e: any) {
        addLog(`WARNING during setAvatar: ${e.message}`);
      }
    }
  }, [avatarName, isLoaded]);

  return (
    <div
      ref={containerRef}
      className="cwasa-avatar-container relative w-full h-full min-h-[480px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col items-center justify-center"
      style={{ minHeight: '480px', position: 'relative' }}
    >
      <style jsx global>{`
        .CWASAAvatar.av0 {
          width: 100% !important;
          height: 100% !important;
          min-height: 460px !important;
          position: relative !important;
          background: #020617 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
        }
        .CWASAAvatar.av0 canvas,
        .CWASAAvatar.av0 .divAv {
          width: 100% !important;
          height: 100% !important;
          min-height: 460px !important;
          object-fit: contain !important;
        }
      `}</style>

      {/* Loading Overlay */}
      {!isLoaded && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-20 text-cyan-400 p-6 text-center">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-lg text-white">Initializing Kozha 3D Avatar ({avatarName.toUpperCase()})...</p>
          <p className="text-sm text-slate-400 mt-1">Loading WebGL shaders & Kozha avatar JAR models (/cwa/avatars/{avatarName}.jar)</p>
        </div>
      )}

      {/* Error / Timeout Fallback */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-30 text-cyan-200 p-6 text-center">
          <span className="text-4xl mb-3">⚠️</span>
          <p className="font-bold text-lg text-white">CWASA WebGL Avatar Initialization Notice</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">{errorMsg}</p>
        </div>
      )}

      {/* CWASA WebGL Panel Container */}
      <div
        className="CWASAAvatar av0 w-full h-full flex items-center justify-center"
        style={{ width: '100%', height: '100%', minHeight: '460px', background: '#020617' }}
      />

      {/* On-screen Debug Log Panel */}
      <div className="absolute bottom-2 left-2 right-2 z-30 bg-slate-900/95 border border-slate-800 rounded-xl p-3 text-[11px] font-mono text-slate-300 flex flex-col gap-1.5 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="font-bold text-cyan-400 flex items-center gap-1.5">
            <span>🐞 CWASA Debug Log</span>
            <span className="text-[10px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-800">
              {isLoaded ? 'Engine Ready' : 'Initializing'}
            </span>
          </span>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-[10px] text-slate-400 hover:text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
        </div>

        {showDebug && (
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 max-h-32 overflow-y-auto flex flex-col gap-1 text-[10px]">
            {debugLogs.map((log, i) => (
              <div
                key={i}
                className={log.includes('ERROR') ? 'text-rose-400 font-bold' : log.includes('WARNING') ? 'text-amber-300' : 'text-slate-300'}
              >
                {log}
              </div>
            ))}
            {debugLogs.length === 0 && <div className="text-slate-500 italic">No logs yet...</div>}
          </div>
        )}
      </div>
    </div>
  );
}
