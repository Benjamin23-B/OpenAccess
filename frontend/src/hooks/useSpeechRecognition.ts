/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { transliterateTamilToThanglish } from './useSpeechSynthesis';

export type ListeningState = 'idle' | 'listening' | 'processing';

export interface SpeechRecognitionError {
  type: 'not-supported' | 'permission-denied' | 'no-speech' | 'timeout' | 'network' | 'unknown';
  message: string;
}

export interface UseSpeechRecognitionReturn {
  transcript: string;
  interimTranscript: string;
  listeningState: ListeningState;
  error: SpeechRecognitionError | null;
  isSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
  clearTranscript: () => void;
}

export function useSpeechRecognition(lang: string = 'en-US'): UseSpeechRecognitionReturn {
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [listeningState, setListeningState] = useState<ListeningState>('idle');
  const [error, setError] = useState<SpeechRecognitionError | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const restartPendingRef = useRef(false);

  const langRef = useRef(lang);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang === 'thanglish' || lang === 'ta-IN-Latn' ? 'ta-IN' : lang;
    }
  }, [lang]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      Promise.resolve().then(() => {
        setIsSupported(false);
        setError({
          type: 'not-supported',
          message: 'Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.'
        });
      });
      return;
    }

    let recognition: any;
    try {
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang === 'thanglish' || lang === 'ta-IN-Latn' ? 'ta-IN' : lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setListeningState('listening');
        setError(null);
        
        // Set a timeout for no speech detected
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          if (listeningState === 'listening' && !interimTranscript && !transcript) {
            setError({
              type: 'no-speech',
              message: 'No speech detected. Please speak clearly into your microphone.'
            });
          }
        }, 10000);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }

        const currentLang = langRef.current;
        if (currentLang === 'thanglish' || currentLang === 'ta-IN-Latn') {
          final = transliterateTamilToThanglish(final);
          interim = transliterateTamilToThanglish(interim);
        }

        if (final) {
          setTranscript(prev => {
            const newTranscript = prev ? `${prev} ${final}` : final;
            return newTranscript.trim();
          });
          setInterimTranscript('');
        }
        
        if (interim) {
          setInterimTranscript(interim);
        }
      };

      recognition.onerror = (event: any) => {
        let errorInfo: SpeechRecognitionError;
        
        switch (event.error) {
          case 'not-allowed':
          case 'service-not-allowed':
            errorInfo = {
              type: 'permission-denied',
              message: 'Microphone access denied. Please allow microphone permissions in your browser settings.'
            };
            break;
          case 'no-speech':
            errorInfo = {
              type: 'no-speech',
              message: 'No speech was detected. Please try speaking again.'
            };
            break;
          case 'network':
            errorInfo = {
              type: 'network',
              message: 'Network error occurred. Please check your internet connection.'
            };
            break;
          case 'aborted':
            // User aborted, not an error
            return;
          default:
            errorInfo = {
              type: 'unknown',
              message: `An error occurred: ${event.error}`
            };
        }
        
        setError(errorInfo);
        setListeningState('idle');
      };

      recognition.onend = () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        setListeningState('idle');
        setInterimTranscript('');
        
        // Auto-restart if not manually stopped and we have a transcript
        if (restartPendingRef.current && transcript) {
          restartPendingRef.current = false;
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {
              // Ignore restart errors
            }
          }, 100);
        }
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('Speech Recognition instantiation failed or was blocked by browser security:', e);
      return;
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {
        // Ignore stop errors on cleanup
      }
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || !isSupported) {
      setError({
        type: 'not-supported',
        message: 'Speech recognition is not available.'
      });
      return;
    }

    try {
      setError(null);
      setListeningState('processing');
      restartPendingRef.current = true;
      await recognitionRef.current.start();
    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError({
          type: 'permission-denied',
          message: 'Microphone permission denied. Please enable it in your browser settings.'
        });
      } else {
        setError({
          type: 'unknown',
          message: `Failed to start: ${err.message}`
        });
      }
      setListeningState('idle');
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    restartPendingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
    }
    setListeningState('idle');
    setInterimTranscript('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    transcript,
    interimTranscript,
    listeningState,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    clearTranscript
  };
}
