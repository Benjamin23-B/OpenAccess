import { VRM } from '@pixiv/three-vrm';
import { SignAnimationController } from './SignAnimationController.ts';

interface Keyframe {
  duration: number;
  pose: { [boneName: string]: any };
}

export const GESTURES: { [name: string]: Keyframe[] } = {
  HELLO: [
    {
      duration: 0.35,
      pose: {
        rightUpperArm: [0, 0, -1.0],
        rightLowerArm: [0, 0.7, 0.1],
        rightHand: [0, 0, 0.2],
        head: [0, 0.05, 0],
        chest: [0, 0, 0.02]
      }
    },
    {
      duration: 0.35,
      pose: {
        rightLowerArm: [0, 1.1, -0.1],
        rightHand: [0, 0, -0.2],
        head: [0, -0.05, 0]
      }
    },
    {
      duration: 0.35,
      pose: {
        rightLowerArm: [0, 0.7, 0.1],
        rightHand: [0, 0, 0.2],
        head: [0, 0.02, 0]
      }
    }
  ],
  THANK_YOU: [
    {
      duration: 0.4,
      pose: {
        rightUpperArm: [-0.4, 0, -0.8],
        rightLowerArm: [0.6, 1.2, 0.5],
        rightHand: [0.2, 0, -0.1],
        head: [0.08, 0, 0],
        chest: [0.02, 0, 0]
      }
    },
    {
      duration: 0.5,
      pose: {
        rightUpperArm: [-0.2, 0, -0.4],
        rightLowerArm: [0, 0.5, 0.2],
        rightHand: [0, 0, 0],
        head: [0, 0, 0],
        chest: [0.08, 0, 0]
      }
    }
  ],
  YES: [
    {
      duration: 0.3,
      pose: {
        head: [0.15, 0, 0],
        chest: [0.04, 0, 0]
      }
    },
    {
      duration: 0.3,
      pose: {
        head: [-0.05, 0, 0]
      }
    },
    {
      duration: 0.3,
      pose: {
        head: [0.15, 0, 0],
        chest: [0.04, 0, 0]
      }
    }
  ],
  NO: [
    {
      duration: 0.35,
      pose: {
        head: [0, 0.18, 0],
        chest: [0, 0.02, 0]
      }
    },
    {
      duration: 0.35,
      pose: {
        head: [0, -0.18, 0]
      }
    },
    {
      duration: 0.35,
      pose: {
        head: [0, 0, 0]
      }
    }
  ],
  PLEASE: [
    {
      duration: 0.45,
      pose: {
        rightUpperArm: [0.1, 0, -0.5],
        rightLowerArm: [0, 1.1, 0.6],
        rightHand: [0, 0, 0],
        chest: [0.10, 0, 0],
        head: [0.06, 0, 0]
      }
    },
    {
      duration: 0.45,
      pose: {
        rightLowerArm: [0.1, 0.9, 0.4]
      }
    }
  ],
  GOOD: [
    {
      duration: 0.45,
      pose: {
        rightUpperArm: [-0.2, 0, -0.5],
        rightLowerArm: [0, 0.8, 0.5],
        rightHand: [0, 0, 0],
        rightThumbProximal: [-0.25, 0.15, 0],
        rightIndexProximal: [1.2, 0, 0],
        rightIndexIntermediate: [1.2, 0, 0],
        rightIndexDistal: [0.8, 0, 0],
        rightMiddleProximal: [1.2, 0, 0],
        rightMiddleIntermediate: [1.2, 0, 0],
        rightMiddleDistal: [0.8, 0, 0],
        rightRingProximal: [1.2, 0, 0],
        rightRingIntermediate: [1.2, 0, 0],
        rightRingDistal: [0.8, 0, 0],
        rightLittleProximal: [1.2, 0, 0],
        rightLittleIntermediate: [1.2, 0, 0],
        rightLittleDistal: [0.8, 0, 0],
        chest: [0.02, 0, 0]
      }
    }
  ],
  GOOD_MORNING: [
    {
      duration: 0.4,
      pose: {
        rightUpperArm: [-0.2, 0, -0.5],
        rightLowerArm: [0, 0.8, 0.5],
        rightHand: [0, 0, 0]
      }
    },
    {
      duration: 0.5,
      pose: {
        rightUpperArm: [-0.8, 0, -1.2],
        rightLowerArm: [0, 0.4, 0],
        rightHand: [0, 0, 0],
        leftUpperArm: [-0.8, 0, 1.2],
        leftLowerArm: [0, -0.4, 0],
        leftHand: [0, 0, 0],
        head: [-0.08, 0, 0],
        chest: [0.05, 0, 0]
      }
    }
  ],
  STOP: [
    {
      duration: 0.4,
      pose: {
        rightUpperArm: [-0.4, 0, -0.7],
        rightLowerArm: [0, 0.8, 0.3],
        rightHand: [-0.5, 0, 0.6],
        head: [0, 0, 0],
        chest: [-0.03, 0, 0]
      }
    }
  ]
};

export class SignAnimationEngine {
  public vrm: VRM;
  public controller: SignAnimationController;
  public queue: Keyframe[] = [];
  public currentKeyframe: Keyframe | null = null;
  public elapsedTime: number = 0;
  public isPlaying: boolean = false;
  public onCompleteCallback: (() => void) | null = null;

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.controller = new SignAnimationController(vrm);
  }

  public setSpeed(speed: number) {
    this.controller.setSpeed(speed);
  }

  public playGesture(gestureName: string, onComplete: (() => void) | null = null) {
    const keyframes = GESTURES[gestureName];
    if (!keyframes) {
      console.warn(`Gesture ${gestureName} not found in database.`);
      return false;
    }

    this.queue = JSON.parse(JSON.stringify(keyframes));
    this.onCompleteCallback = onComplete;
    this.isPlaying = true;
    this.currentKeyframe = null;
    this.elapsedTime = 0;
    this._nextKeyframe();
    return true;
  }

  private _nextKeyframe() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.currentKeyframe = null;
      if (this.onCompleteCallback) {
        this.onCompleteCallback();
      }
      return;
    }

    this.currentKeyframe = this.queue.shift()!;
    this.elapsedTime = 0;
    this.controller.animatePose(this.currentKeyframe.pose, this.currentKeyframe.duration);
  }

  public stop(duration = 0.5) {
    this.queue = [];
    this.currentKeyframe = null;
    this.isPlaying = false;
    this.controller.resetPose(duration);
  }

  public update(delta: number) {
    this.controller.update(delta);

    if (!this.isPlaying || !this.currentKeyframe) return;

    this.elapsedTime += delta * this.controller.speed;
    if (this.elapsedTime >= this.currentKeyframe.duration) {
      this._nextKeyframe();
    }
  }
}
