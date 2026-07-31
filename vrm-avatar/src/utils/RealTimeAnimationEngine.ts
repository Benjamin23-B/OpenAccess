import { VRM } from '@pixiv/three-vrm';
import { SignAnimationEngine } from './SignAnimationEngine.ts';

export class RealTimeAnimationEngine {
  public vrm: VRM;
  public animationEngine: SignAnimationEngine;
  public queue: string[] = [];
  public currentSign: string | null = null;
  public isPlayingSign: boolean = false;
  public isIdle: boolean = true;
  public speed: number = 1.0;

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.animationEngine = new SignAnimationEngine(vrm);
  }

  public setSpeed(speedMultiplier: number) {
    this.speed = speedMultiplier;
    this.animationEngine.setSpeed(speedMultiplier);
  }

  public receivePrediction(signName: string, interrupt = false) {
    const formattedSign = signName.toUpperCase().replace(/\s+/g, '_');

    if (interrupt) {
      this.queue = [];
      this.currentSign = null;
      this.isPlayingSign = false;
      this._playSign(formattedSign);
    } else {
      this.queue.push(formattedSign);
    }
  }

  private _playSign(signName: string) {
    this.isPlayingSign = true;
    this.isIdle = false;
    this.currentSign = signName;

    const success = this.animationEngine.playGesture(signName, () => {
      this.currentSign = null;
      this.isPlayingSign = false;
      this._processQueue();
    });

    if (!success) {
      this.isPlayingSign = false;
      this.currentSign = null;
      this._processQueue();
    }
  }

  private _processQueue() {
    if (this.queue.length > 0) {
      const nextSign = this.queue.shift()!;
      this._playSign(nextSign);
    } else {
      this.isIdle = true;
      this.animationEngine.stop(0.5);
    }
  }

  public clearQueue() {
    this.queue = [];
    this.currentSign = null;
    this.isPlayingSign = false;
    this.isIdle = true;
    this.animationEngine.stop(0.5);
  }

  public update(delta: number) {
    this.animationEngine.update(delta);

    if (!this.isPlayingSign && this.queue.length > 0) {
      this._processQueue();
    }
  }
}
export default RealTimeAnimationEngine;
