/* eslint-disable @typescript-eslint/no-explicit-any */
// Bidirectional Speech Bridge Service (STT/TTS)

export class SpeechBridge {
  private recognition: any | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private onResult: ((text: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          this.recognition = new SpeechRecognition();
          this.recognition.continuous = true;
          this.recognition.interimResults = true;
          
          this.recognition.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
              if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
              } else {
                interimTranscript += event.results[i][0].transcript;
              }
            }
            
            if (finalTranscript && this.onResult) {
              this.onResult(finalTranscript);
            }
          };

          this.recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
          };
        } catch (e) {
          console.warn('Speech Recognition instantiation failed or was blocked by browser security:', e);
          this.recognition = null;
        }
      } else {
        console.warn('Speech Recognition API not supported in this browser. Fallback to Whisper.cpp required.');
      }

      this.synthesis = window.speechSynthesis;
    }
  }

  setResultCallback(callback: (text: string) => void) {
    this.onResult = callback;
  }

  startListening() {
    if (this.recognition && !this.isListening) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  speak(text: string, voiceURI?: string) {
    if (!this.synthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Optional: Select specific voice
    if (voiceURI) {
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(v => v.voiceURI === voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    // SSML is natively supported in some TTS engines or through backend ElevenLabs/Coqui
    this.synthesis.speak(utterance);
  }
}
