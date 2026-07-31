/**
 * sceneAudioQueue.ts — Non-blocking audio queue with Web Audio stereo panning.
 *
 * Sits on top of the existing Web Speech Synthesis API.
 * Objects on the left pan audio left; objects on the right pan audio right.
 * One utterance at a time — the queue drains sequentially.
 */

export interface AudioItem {
  text: string;
  /** Stereo pan: -1.0 (far left) to +1.0 (far right) */
  pan: number;
  /** Delay in ms before speaking */
  delayMs: number;
  tier: number;
}

// Position label → pan value
const PAN_MAP: Record<string, number> = {
  'far left':  -0.9,
  'left':      -0.5,
  'centre':     0.0,
  'right':      0.5,
  'far right':  0.9,
};

export function panForPosition(position: string): number {
  return PAN_MAP[position] ?? 0;
}

export class SceneAudioQueue {
  private queue: AudioItem[] = [];
  private isPlaying = false;
  private audioCtx: AudioContext | null = null;
  private pannerNode: StereoPannerNode | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
      this.pannerNode = this.audioCtx.createStereoPanner();
      this.pannerNode.connect(this.audioCtx.destination);
    }
    return this.audioCtx;
  }

  /**
   * Enqueue an item. Tier-1 items are pushed to the front of the queue.
   * Returns immediately — never blocks.
   */
  enqueue(item: AudioItem): void {
    if (item.tier === 1) {
      // Tier 1 hazards jump ahead of all Tier 2/3 items
      const insertAt = this.queue.findIndex(q => q.tier > 1);
      if (insertAt === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertAt, 0, item);
      }
    } else {
      this.queue.push(item);
    }

    if (!this.isPlaying) {
      this.drain();
    }
  }

  private async drain(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const item = this.queue.shift()!;

    // Respect the delay
    if (item.delayMs > 0) {
      await sleep(item.delayMs);
    }

    await this.speak(item.text, item.pan);
    this.drain();
  }

  private speak(text: string, pan: number): Promise<void> {
    return new Promise(resolve => {
      if (typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      // Set stereo pan via Web Audio API destination
      try {
        const ctx = this.getAudioContext();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        if (this.pannerNode) {
          this.pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
        }
      } catch {
        // AudioContext not available — continue without panning
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.1;   // slightly faster for accessibility
      utterance.volume = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });
  }

  /** Clear all queued items and stop current speech. */
  clear(): void {
    this.queue = [];
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.isPlaying = false;
  }

  destroy(): void {
    this.clear();
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.pannerNode = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
