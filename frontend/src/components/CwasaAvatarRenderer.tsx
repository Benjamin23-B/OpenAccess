'use client';

import React, { useEffect, useRef, useState } from 'react';

interface CwasaAvatarRendererProps {
  sigmlText?: string;
  avatarName?: 'anna' | 'marc' | 'francoise' | 'luna' | 'siggi';
  signingSpeed?: number;
  onStatusChange?: (status: string) => void;
  playNonce?: number;
}

declare global {
  interface Window {
    CWASA?: any;
    CWASA_READY?: boolean;
    __nativeWebAssembly?: any;
  }
}

export default function CwasaAvatarRenderer({
  sigmlText = '',
  avatarName = 'luna',
  signingSpeed = 1.0,
  onStatusChange,
  playNonce = 0,
}: CwasaAvatarRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPlayedSigml = useRef<string>('');
  const lastPlayNonce = useRef<number>(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Intercept browser alert dialogs and direct them to console logging instead
    if (typeof window !== 'undefined') {
      window.alert = (msg?: any) => {
        console.warn('[Avatar Engine Notice (Alert Suppressed)]:', msg);
      };

      // Suppress unhandled promise rejections caused by audio play() interruptions / unsupported sources
      const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
        if (
          event.reason &&
          (event.reason.name === 'AbortError' ||
           event.reason.name === 'NotSupportedError' ||
           (typeof event.reason.message === 'string' &&
            (event.reason.message.includes('play()') ||
             event.reason.message.includes('supported source') ||
             event.reason.message.includes('media was removed'))))
        ) {
          event.preventDefault();
          console.warn('[Media Playback Suppressed]:', event.reason.message || event.reason);
        }
      };

      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    // 1. Snapshot browser's native WebAssembly BEFORE allcsa.js (exact Kozha app.html pattern)
    if (typeof window !== 'undefined' && window.WebAssembly && !window.__nativeWebAssembly) {
      window.__nativeWebAssembly = window.WebAssembly;
    }

    const initCWASA = () => {
      if (initializedRef.current) return;
      if (!window.CWASA || typeof window.CWASA.init !== 'function') return;
      initializedRef.current = true;

      try {
        // Kozha app.html exact init configuration
        window.CWASA.init({
          useClientConfig: false,
          useCwaConfig: true,
          avSettings: [
            {
              width: 512,
              height: 384,
              avList: 'avsfull',
              initAv: avatarName || 'luna',
              ambIdle: true,
              allowFrameSteps: false,
              allowSiGMLText: false,
              audioEnabled: false,
            },
          ],
        });

        const onReady = () => {
          setIsLoaded(true);
          onStatusChange?.('Kozha 3D Avatar Ready');
        };

        const onIdle = () => {
          onStatusChange?.('Idle');
        };

        if (window.CWASA.ready && typeof window.CWASA.ready.then === 'function') {
          window.CWASA.ready.then(onReady).catch(() => setIsLoaded(true));
        } else {
          setTimeout(onReady, 2000);
        }

        if (typeof window.CWASA.addHook === 'function') {
          window.CWASA.addHook('avatarready', onReady, 0);
          window.CWASA.addHook('stopped', onIdle, 0);
          window.CWASA.addHook('idle', onIdle, 0);
        }
      } catch (e) {
        console.warn('CWASA init notice:', e);
        setIsLoaded(true);
      }
    };

    // Load cwasa.css
    if (!document.getElementById('cwasa-css')) {
      const link = document.createElement('link');
      link.id = 'cwasa-css';
      link.rel = 'stylesheet';
      link.href = '/cwa/cwasa.css';
      document.head.appendChild(link);
    }

    // Load the Kozha SiGML validator (provides window.SigmlValidator). It is a
    // no-op until CWASA is ready and exposes its HamNoSys tag set; kozhaClient
    // accepts entries as "unchecked" (valid) if it is not yet available.
    if (!document.getElementById('sigml-validator-js')) {
      const vscript = document.createElement('script');
      vscript.id = 'sigml-validator-js';
      vscript.src = '/sigml-validator.js';
      vscript.async = true;
      document.head.appendChild(vscript);
    }

    // Load allcsa.js if not already present
    if (window.CWASA && typeof window.CWASA.init === 'function') {
      initCWASA();
      return;
    }

    const existingScript = document.getElementById('cwasa-js');
    if (existingScript) {
      const poll = setInterval(() => {
        if (window.CWASA && typeof window.CWASA.init === 'function') {
          clearInterval(poll);
          initCWASA();
        }
      }, 100);
      return;
    }

    const script = document.createElement('script');
    script.id = 'cwasa-js';
    script.src = '/cwa/allcsa.js';
    script.defer = true;

    script.onload = () => {
      let attempts = 0;
      const check = setInterval(() => {
        attempts++;
        if (window.CWASA && typeof window.CWASA.init === 'function') {
          clearInterval(check);
          initCWASA();
        } else if (attempts > 50) {
          clearInterval(check);
          setIsLoaded(true);
        }
      }, 100);
    };

    script.onerror = () => {
      setErrorMsg('Failed to load Kozha 3D avatar script (/cwa/allcsa.js)');
      onStatusChange?.('Engine Error');
    };

    document.body.appendChild(script);
  }, []);

  // Play SiGML whenever sigmlText updates and transition to Idle on completion.
  //
  // Real Kozha behaviour: play the composed `<sigml>` document verbatim (already
  // validated by kozhaClient.buildSigml) and let CWASA's `ambIdle` animation
  // return the avatar to a natural rest pose. We deliberately do NOT call
  // `CWASA.stop(0)` after a guessed timeout — that freezes the WebGL bone meshes
  // at the last-applied frame, leaving the model in a skewed "weird" pose.
  useEffect(() => {
    if (!sigmlText || !isLoaded) return;
    if (typeof sigmlText !== 'string' || !sigmlText.trim()) return;
    if (sigmlText.includes('[object Object]')) return;

    const isNewSigml = sigmlText !== lastPlayedSigml.current;
    const isNewNonce = playNonce !== 0 && playNonce !== lastPlayNonce.current;

    if (!isNewSigml && !isNewNonce) return;

    if (window.CWASA && typeof window.CWASA.playSiGMLText === 'function') {
      try {
        lastPlayedSigml.current = sigmlText;
        lastPlayNonce.current = playNonce;
        onStatusChange?.('Signing Animation');
        window.CWASA.playSiGMLText(sigmlText, 0);
      } catch (err: any) {
        console.warn('CWASA Play Error:', err);
      }
    }
  }, [sigmlText, isLoaded, playNonce, onStatusChange]);

  // Switch avatar character
  useEffect(() => {
    if (!avatarName || !isLoaded) return;
    try {
      const cwaMenu = document.querySelector('.menuAv.av0') as HTMLSelectElement;
      if (cwaMenu && cwaMenu.value !== avatarName) {
        cwaMenu.value = avatarName;
        cwaMenu.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      console.warn('Avatar switch error:', e);
    }
  }, [avatarName, isLoaded]);

  return (
    <div
      ref={containerRef}
      className="cwasa-avatar-container relative w-full h-[480px] min-h-[480px] bg-[#0F172A] rounded-xl overflow-hidden border border-[#1F3A5F] shadow-sm flex flex-col items-center justify-center"
      style={{ width: '100%', height: '480px', minHeight: '480px', position: 'relative' }}
    >
      <style jsx global>{`
        .CWASAAvatar.av0,
        .CWASAAvatar {
          width: 100% !important;
          height: 480px !important;
          min-height: 480px !important;
          position: relative !important;
          background: #0F172A !important;
          display: block !important;
        }
        .CWASAAvatar.av0 canvas,
        .CWASAAvatar canvas,
        .CWASAAvatar.av0 .divAv,
        .CWASAAvatar .divAv {
          width: 100% !important;
          height: 480px !important;
          min-height: 480px !important;
          display: block !important;
          object-fit: contain !important;
        }
      `}</style>

      {/* Loading Overlay */}
      {!isLoaded && !errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A] z-20 text-[#0B5CAD] p-6 text-center">
          <div className="w-12 h-12 border-4 border-[#0B5CAD] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-lg text-white">Initializing Kozha 3D Avatar ({avatarName.toUpperCase()})...</p>
          <p className="text-sm text-slate-300 mt-1">Loading Kozha WebGL engine & avatar models</p>
        </div>
      )}

      {/* Error Fallback */}
      {errorMsg && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0F172A] z-30 text-sky-200 p-6 text-center">
          <span className="text-4xl mb-3">⚠️</span>
          <p className="font-bold text-lg text-white">CWASA WebGL Avatar Notice</p>
          <p className="text-xs text-slate-300 mt-1 max-w-sm">{errorMsg}</p>
        </div>
      )}

      {/* CWASA WebGL Canvas Container - Exact Kozha app.html DOM structure */}
      <div
        className="CWASAAvatar av0 w-full h-[480px] block"
        style={{ width: '100%', height: '480px', minHeight: '480px', background: '#0F172A', display: 'block' }}
      />
      <div className="CWASAAvMenu av0" style={{ display: 'none' }} aria-hidden="true" />
      <div className="CWASAGUI av0" style={{ display: 'none' }} aria-hidden="true" />
    </div>
  );
}
