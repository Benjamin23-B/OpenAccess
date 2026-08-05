'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type SpeechState = 'idle' | 'speaking' | 'paused';

export interface SpeechVoice {
  name: string;
  lang: string;
  voiceURI: string;
  default: boolean;
}

export interface UseSpeechSynthesisReturn {
  speechState: SpeechState;
  voices: SpeechVoice[];
  selectedVoice: SpeechVoice | null;
  rate: number;
  pitch: number;
  isSupported: boolean;
  error: string | null;
  setSelectedVoice: (voice: SpeechVoice | null) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  speak: (text: string, lang?: 'en-IN' | 'ta-IN' | 'thanglish') => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

export function transliterateTamilToThanglish(text: string): string {
  let result = '';
  let i = 0;
  
  const bases: { [key: string]: string } = {
    'க': 'k', 'ங': 'ng', 'ச': 'ch', 'ஞ': 'nj', 'ட': 't', 'ண': 'n',
    'த': 'th', 'ந': 'n', 'ப': 'p', 'ம': 'm', 'ய': 'y', 'ர': 'r',
    'ல': 'l', 'வ': 'v', 'ழ': 'zh', 'ள': 'l', 'ற': 'r', 'ன': 'n',
    'ஸ': 's', 'ஷ': 'sh', 'ஜ': 'j', 'ஹ': 'h'
  };

  const vowelSigns: { [key: string]: string } = {
    'ா': 'a',
    'ி': 'i', 'ீ': 'ee', 'ு': 'u', 'ூ': 'oo',
    'ெ': 'e', 'ே': 'ae', 'ை': 'ai', 'ொ': 'o', 'ோ': 'oe', 'ௌ': 'au'
  };

  const independentVowels: { [key: string]: string } = {
    'அ': 'a', 'ஆ': 'aa', 'இ': 'i', 'ஈ': 'ee', 'உ': 'u', 'ஊ': 'oo',
    'எ': 'e', 'ஏ': 'ae', 'ஐ': 'ai', 'ஒ': 'o', 'ஓ': 'oe', 'ஔ': 'au',
    'ஃ': 'h'
  };

  const isVowelOrSign = (c: string) => {
    return c && (c in independentVowels || c in vowelSigns || c === 'ா');
  };

  while (i < text.length) {
    const char = text[i];
    
    if (char in bases) {
      const nextChar = text[i + 1];
      let consonantSound = bases[char];
      
      // Context-aware voicing rules for better Thanglish readability:
      // Voicing rules only apply to non-pure consonants (nextChar !== '்')
      if (i > 0 && nextChar !== '்') {
        const prevChar = text[i - 1];
        
        // Post-nasal voicing (e.g. ண்ட -> nda, ந்த -> ndha, ம்ப -> mba, ன்ற -> ndra)
        if (prevChar === '்' && i > 1) {
          const prePrevChar = text[i - 2];
          if (prePrevChar === 'ங') consonantSound = 'g';
          if (prePrevChar === 'ஞ') consonantSound = 'j';
          if (prePrevChar === 'ண') consonantSound = 'd';
          if (prePrevChar === 'ந' || prePrevChar === 'ன') {
            if (char === 'ற') consonantSound = 'dr'; // ன்ற -> ndra
            else consonantSound = 'd';
          }
          if (prePrevChar === 'ம') consonantSound = 'b';
        }
        // Intervocalic single voicing (e.g., படம் -> padam, எப்படி -> eppadi, அகம் -> agam)
        else {
          const isPrevVocalic = isVowelOrSign(prevChar) || (prevChar in bases && prevChar !== '்');
          if (isPrevVocalic) {
            if (char === 'ட') consonantSound = 'd';
            if (char === 'ப') consonantSound = 'b';
            if (char === 'க') consonantSound = 'g';
            if (char === 'த') consonantSound = 'dh';
          }
        }
      }

      if (nextChar === '்') {
        result += consonantSound;
        i += 2;
      } else if (nextChar in vowelSigns) {
        const vowelSound = vowelSigns[nextChar];
        result += consonantSound + vowelSound;
        i += 2;
      } else {
        result += consonantSound + 'a';
        i += 1;
      }
    } else if (char in independentVowels) {
      result += independentVowels[char];
      i += 1;
    } else {
      result += char;
      i += 1;
    }
  }
  
  return result;
}


export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [speechState, setSpeechState] = useState<SpeechState>('idle');
  const [voices, setVoices] = useState<SpeechVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechVoice | null>(null);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentTextRef = useRef<string>('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<string[]>([]);
  const currentQueueIndexRef = useRef<number>(0);

  const selectedVoiceRef = useRef<SpeechVoice | null>(null);
  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const synthesis = window.speechSynthesis;
    
    if (!synthesis) {
      Promise.resolve().then(() => {
        setIsSupported(false);
        setError('Text-to-speech is not supported in this browser.');
      });
      return;
    }

    synthesisRef.current = synthesis;

    const loadVoices = () => {
      const availableVoices = synthesis.getVoices();
      
      // Filter native system voices to keep only Indian English (en-IN) and Tamil (ta)
      const hasEnIN = availableVoices.some(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
      
      const filtered = availableVoices.filter(v => {
        const lang = v.lang.toLowerCase().replace('_', '-');
        if (lang.startsWith('en-in')) return true;
        if (lang.startsWith('ta')) return true;
        
        // Fallback: if no en-IN is installed on system, keep other English voices
        if (!hasEnIN && lang.startsWith('en')) return true;
        
        return false;
      });

      const mappedVoices: SpeechVoice[] = filtered.map(v => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
        default: v.default
      }));

      // Append Thanglish virtual voice
      const thanglishVoice: SpeechVoice = {
        name: 'Thanglish',
        lang: 'ta-IN-Latn',
        voiceURI: 'thanglish-virtual-voice',
        default: false
      };
      
      mappedVoices.push(thanglishVoice);
      
      setVoices(mappedVoices);
      
      // Select a default voice (prefer Google Indian English, then Microsoft Indian English, then general English)
      if (!selectedVoiceRef.current && mappedVoices.length > 0) {
        const enINVoices = mappedVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
        const googleEnIN = enINVoices.find(v => v.name.toLowerCase().includes('google'));
        
        const defaultVoice = googleEnIN || 
          enINVoices.find(v => v.default) || 
          enINVoices[0] ||
          mappedVoices.find(v => v.lang.toLowerCase().startsWith('en') && v.name.toLowerCase().includes('google')) ||
          mappedVoices.find(v => v.lang.toLowerCase().startsWith('en')) || 
          mappedVoices[0];
        
        setSelectedVoice(defaultVoice);
        selectedVoiceRef.current = defaultVoice;
      }
    };

    // Load voices immediately and when they change
    loadVoices();
    synthesis.onvoiceschanged = loadVoices;

    return () => {
      synthesis.cancel();
      synthesis.onvoiceschanged = null;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speakLocal = useCallback((text: string, lang?: 'en-IN' | 'ta-IN' | 'thanglish') => {
    if (!synthesisRef.current) return;
    setError(null);

    // Detach listeners on active utterance before cancelling to prevent spurious interrupted errors
    if (utteranceRef.current) {
      utteranceRef.current.onerror = null;
      utteranceRef.current.onend = null;
    }
    synthesisRef.current.cancel();

    let textToSpeak = text;
    let voiceToUse: SpeechSynthesisVoice | null = null;

    const allVoices = synthesisRef.current.getVoices();

    if (lang === 'ta-IN') {
      const tamilVoices = allVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('ta'));
      const googleTamil = tamilVoices.find(v => v.name.toLowerCase().includes('google'));
      voiceToUse = googleTamil || tamilVoices[0] || null;
      if (!voiceToUse) {
        // Fallback to Thanglish local speech if no Tamil voice is on OS
        textToSpeak = transliterateTamilToThanglish(text);
        const enINVoices = allVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
        const googleEnIN = enINVoices.find(v => v.name.toLowerCase().includes('google'));
        voiceToUse = googleEnIN || enINVoices[0] || allVoices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
      }
    } else if (lang === 'thanglish') {
      textToSpeak = transliterateTamilToThanglish(text);
      const enINVoices = allVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
      const googleEnIN = enINVoices.find(v => v.name.toLowerCase().includes('google'));
      voiceToUse = googleEnIN || enINVoices[0] || allVoices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
    } else if (lang === 'en-IN') {
      const hasTamilText = /[\u0B80-\u0BFF]/.test(text);
      if (hasTamilText) {
        textToSpeak = transliterateTamilToThanglish(text);
      }
      const enINVoices = allVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
      const googleEnIN = enINVoices.find(v => v.name.toLowerCase().includes('google'));
      voiceToUse = googleEnIN || enINVoices[0] || allVoices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
    } else if (selectedVoice) {
      const isTamilVoice = selectedVoice.lang.toLowerCase().startsWith('ta') && selectedVoice.voiceURI !== 'thanglish-virtual-voice';
      const hasTamilText = /[\u0B80-\u0BFF]/.test(text);

      if (selectedVoice.voiceURI === 'thanglish-virtual-voice' || (!isTamilVoice && hasTamilText)) {
        textToSpeak = transliterateTamilToThanglish(text);
        const enINVoices = allVoices.filter(v => v.lang.toLowerCase().replace('_', '-').startsWith('en-in'));
        const googleEnIN = enINVoices.find(v => v.name.toLowerCase().includes('google'));
        voiceToUse = googleEnIN || enINVoices[0] || allVoices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
      } else {
        voiceToUse = allVoices.find(v => v.voiceURI === selectedVoice.voiceURI) || null;
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    // Scale standard local voice rate down by 0.7 to make it a comfortable average speed
    utterance.rate = rate * 0.7;
    utterance.pitch = pitch;
    
    if (voiceToUse) {
      utterance.voice = voiceToUse;
    }

    utterance.onstart = () => {
      setSpeechState('speaking');
      setError(null);
    };

    utterance.onend = () => {
      setSpeechState('idle');
      utteranceRef.current = null;
    };

    utterance.onerror = (event) => {
      // Ignore 'canceled' and 'interrupted' errors which occur when stopping/re-initiating speech
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        setError(`Speech error: ${event.error}`);
      }
      setSpeechState('idle');
      utteranceRef.current = null;
    };

    utterance.onpause = () => {
      setSpeechState('paused');
    };

    utterance.onresume = () => {
      setSpeechState('speaking');
    };

    utteranceRef.current = utterance;
    currentTextRef.current = textToSpeak;
    synthesisRef.current.speak(utterance);
  }, [selectedVoice, rate, pitch]);

  const speakCloudTTS = useCallback((text: string, langCode: string, lang?: 'en-IN' | 'ta-IN' | 'thanglish') => {
    // Stop local speech synthesis or active audio
    if (utteranceRef.current) {
      utteranceRef.current.onerror = null;
      utteranceRef.current.onend = null;
    }
    synthesisRef.current?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Split text into chunks of max 150 characters (safe limit for Google Translate TTS API)
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    
    let currentChunk = '';
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > 150) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    if (chunks.length === 0) {
      setSpeechState('idle');
      return;
    }

    // Set state immediately to speaking to enable the Pause/Stop buttons
    setSpeechState('speaking');

    audioQueueRef.current = chunks;
    currentQueueIndexRef.current = 0;

    const playNextChunk = () => {
      if (currentQueueIndexRef.current >= audioQueueRef.current.length) {
        setSpeechState('idle');
        audioRef.current = null;
        return;
      }

      setSpeechState('speaking');

      const chunkText = audioQueueRef.current[currentQueueIndexRef.current];
      // Scale standard cloud voice speed parameter down by 0.7 to make it a comfortable average speed (max 1.0)
      const speedParam = Math.max(0.1, Math.min(1.0, rate * 0.7));
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&ttsspeed=${speedParam}&q=${encodeURIComponent(chunkText)}`;
      
      const audio = new Audio();
      audio.setAttribute('referrerpolicy', 'no-referrer');
      audio.src = url;
      audioRef.current = audio;

      audio.onplay = () => {
        setSpeechState('speaking');
        setError(null);
      };

      audio.onended = () => {
        currentQueueIndexRef.current += 1;
        playNextChunk();
      };

      audio.onerror = (e) => {
        console.warn('Cloud TTS error, falling back to local speech synthesis:', e);
        const remainingText = audioQueueRef.current.slice(currentQueueIndexRef.current).join(' ');
        speakLocal(remainingText, lang);
      };

      audio.play().catch((err) => {
        console.warn('Failed to play cloud audio, falling back to local:', err);
        const remainingText = audioQueueRef.current.slice(currentQueueIndexRef.current).join(' ');
        speakLocal(remainingText, lang);
      });
    };

    playNextChunk();
  }, [rate, speakLocal]);

  const speak = useCallback((text: string, lang?: 'en-IN' | 'ta-IN' | 'thanglish') => {
    setError(null);
    if (!text.trim()) {
      setError('No text to speak. Please enter some text first.');
      return;
    }

    // Determine target language code for Google Translate TTS API
    let langCode = 'en-IN';
    let textToSpeak = text;

    if (lang === 'ta-IN') {
      langCode = 'ta';
    } else if (lang === 'thanglish') {
      langCode = 'en-IN';
      textToSpeak = transliterateTamilToThanglish(text);
    } else if (lang === 'en-IN') {
      langCode = 'en-IN';
      const hasTamilText = /[\u0B80-\u0BFF]/.test(text);
      if (hasTamilText) {
        textToSpeak = transliterateTamilToThanglish(text);
      }
    } else if (selectedVoice) {
      if (selectedVoice.voiceURI === 'thanglish-virtual-voice') {
        langCode = 'en-IN';
        textToSpeak = transliterateTamilToThanglish(text);
      } else if (selectedVoice.lang.toLowerCase().startsWith('ta')) {
        langCode = 'ta';
      } else {
        const hasTamilText = /[\u0B80-\u0BFF]/.test(text);
        if (hasTamilText) {
          langCode = 'en-IN';
          textToSpeak = transliterateTamilToThanglish(text);
        } else {
          // Parse lang code from selectedVoice, default to en-IN
          langCode = selectedVoice.lang.split('-')[0];
          if (selectedVoice.lang.toLowerCase().replace('_', '-').startsWith('en-in')) {
            langCode = 'en-IN';
          }
        }
      }
    }

    // Attempt high quality Google Cloud TTS first
    speakCloudTTS(textToSpeak, langCode, lang);
  }, [selectedVoice, speakCloudTTS]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (synthesisRef.current && (synthesisRef.current.speaking || synthesisRef.current.pending)) {
      synthesisRef.current.pause();
    }
    setSpeechState('paused');
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.error(e));
    }
    if (synthesisRef.current && synthesisRef.current.paused) {
      synthesisRef.current.resume();
    }
    setSpeechState('speaking');
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    audioQueueRef.current = [];
    currentQueueIndexRef.current = 0;
    
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
    }
    setSpeechState('idle');
    utteranceRef.current = null;
  }, []);

  const handleSetRate = useCallback((newRate: number) => {
    const clampedRate = Math.max(0.1, Math.min(2, newRate));
    setRate(clampedRate);
  }, []);

  const handleSetPitch = useCallback((newPitch: number) => {
    const clampedPitch = Math.max(0, Math.min(2, newPitch));
    setPitch(clampedPitch);
  }, []);

  return {
    speechState,
    voices,
    selectedVoice,
    rate,
    pitch,
    isSupported,
    error,
    setSelectedVoice,
    setRate: handleSetRate,
    setPitch: handleSetPitch,
    speak,
    pause,
    resume,
    stop
  };
}
