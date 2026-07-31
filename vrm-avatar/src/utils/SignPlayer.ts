import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

interface Frame {
  time: number;
  leftArm?: any;
  rightArm?: any;
  leftHand?: any;
  rightHand?: any;
  head?: any;
}

interface AnimationData {
  name: string;
  duration: number;
  frames: Frame[];
}

export class SignPlayer {
  public vrm: VRM;
  public animation: AnimationData | null = null;
  public isPlaying = false;
  public currentTime = 0;
  public speed = 1.0;
  public isLooping = false;
  public onCompleteCallback: (() => void) | null = null;
  public joints: { [key: string]: THREE.Object3D } = {};

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.cacheBones();
  }

  private cacheBones() {
    if (!this.vrm || !this.vrm.humanoid) return;

    const boneMapping = {
      leftShoulder: 'leftUpperArm',
      leftElbow: 'leftLowerArm',
      leftWrist: 'leftHand',
      rightShoulder: 'rightUpperArm',
      rightElbow: 'rightLowerArm',
      rightWrist: 'rightHand',
      head: 'head',
      neck: 'neck',
      chest: 'chest',
      spine: 'spine',
      leftThumbProximal: 'leftThumbProximal',
      leftThumbIntermediate: 'leftThumbIntermediate',
      leftThumbDistal: 'leftThumbDistal',
      leftIndexProximal: 'leftIndexProximal',
      leftIndexIntermediate: 'leftIndexIntermediate',
      leftIndexDistal: 'leftIndexDistal',
      leftMiddleProximal: 'leftMiddleProximal',
      leftMiddleIntermediate: 'leftMiddleIntermediate',
      leftMiddleDistal: 'leftMiddleDistal',
      leftRingProximal: 'leftRingProximal',
      leftRingIntermediate: 'leftRingIntermediate',
      leftRingDistal: 'leftRingDistal',
      leftLittleProximal: 'leftLittleProximal',
      leftLittleIntermediate: 'leftLittleIntermediate',
      leftLittleDistal: 'leftLittleDistal',
      rightThumbProximal: 'rightThumbProximal',
      rightThumbIntermediate: 'rightThumbIntermediate',
      rightThumbDistal: 'rightThumbDistal',
      rightIndexProximal: 'rightIndexProximal',
      rightIndexIntermediate: 'rightIndexIntermediate',
      rightIndexDistal: 'rightIndexDistal',
      rightMiddleProximal: 'rightMiddleProximal',
      rightMiddleIntermediate: 'rightMiddleIntermediate',
      rightMiddleDistal: 'rightMiddleDistal',
      rightRingProximal: 'rightRingProximal',
      rightRingIntermediate: 'rightRingIntermediate',
      rightRingDistal: 'rightRingDistal',
      rightLittleProximal: 'rightLittleProximal',
      rightLittleIntermediate: 'rightLittleIntermediate',
      rightLittleDistal: 'rightLittleDistal'
    };

    Object.entries(boneMapping).forEach(([key, boneName]) => {
      const node = this.vrm.humanoid!.getNormalizedBoneNode(boneName as any);
      if (node) {
        this.joints[key] = node;
      }
    });
  }

  public loadAnimation(animationJson: any) {
    if (!animationJson || !animationJson.frames || animationJson.frames.length === 0) {
      console.warn("Invalid sign language animation JSON.");
      return false;
    }

    const sortedFrames = [...animationJson.frames].sort((a, b) => a.time - b.time);
    
    this.animation = {
      name: animationJson.name || "UNNAMED_SIGN",
      duration: animationJson.duration || 1000,
      frames: sortedFrames
    };

    this.currentTime = 0;
    return true;
  }

  public play(loop = false, onComplete: (() => void) | null = null) {
    if (!this.animation) return;
    this.isPlaying = true;
    this.isLooping = loop;
    this.onCompleteCallback = onComplete;
  }

  public pause() {
    this.isPlaying = false;
  }

  public stop() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.resetPose();
  }

  public setSpeed(speedMultiplier: number) {
    this.speed = Math.max(0.1, speedMultiplier);
  }

  public resetPose() {
    const identity = new THREE.Quaternion();
    Object.values(this.joints).forEach((node) => {
      node.quaternion.copy(identity);
    });
  }

  private _parseRotation(rot: any): THREE.Quaternion {
    if (!rot) return new THREE.Quaternion();
    if (Array.isArray(rot)) {
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
    }
    if (typeof rot === 'object') {
      return new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rot.x || 0, rot.y || 0, rot.z || 0)
      );
    }
    return new THREE.Quaternion();
  }

  private _getBoneRotation(frame: Frame, bonePath: string): THREE.Quaternion | null {
    const parts = bonePath.split('.');
    let cur: any = frame;
    for (let i = 0; i < parts.length; i++) {
      if (!cur || cur[parts[i]] === undefined) return null;
      cur = cur[parts[i]];
    }
    return this._parseRotation(cur);
  }

  public update(delta: number) {
    if (!this.isPlaying || !this.animation) return;

    this.currentTime += delta * 1000 * this.speed;

    if (this.currentTime >= this.animation.duration) {
      if (this.isLooping) {
        this.currentTime %= this.animation.duration;
      } else {
        this.currentTime = this.animation.duration;
        this.isPlaying = false;
        if (this.onCompleteCallback) {
          this.onCompleteCallback();
        }
      }
    }

    const frames = this.animation.frames;
    let prevFrame = frames[0];
    let nextFrame = frames[0];

    for (let i = 0; i < frames.length; i++) {
      if (frames[i].time <= this.currentTime) {
        prevFrame = frames[i];
      }
      if (frames[i].time >= this.currentTime) {
        nextFrame = frames[i];
        break;
      }
    }

    let alpha = 0;
    const timeDelta = nextFrame.time - prevFrame.time;
    if (timeDelta > 0) {
      alpha = (this.currentTime - prevFrame.time) / timeDelta;
    } else {
      alpha = 1.0;
    }

    const jointsToAnimate = {
      leftShoulder: 'leftArm.shoulder',
      leftElbow: 'leftArm.elbow',
      leftWrist: 'leftArm.wrist',
      rightShoulder: 'rightArm.shoulder',
      rightElbow: 'rightArm.elbow',
      rightWrist: 'rightArm.wrist',
      head: 'head.rotation',
      leftThumbProximal: 'leftHand.thumbProximal',
      leftThumbIntermediate: 'leftHand.thumbIntermediate',
      leftThumbDistal: 'leftHand.thumbDistal',
      leftIndexProximal: 'leftHand.indexProximal',
      leftIndexIntermediate: 'leftHand.indexIntermediate',
      leftIndexDistal: 'leftHand.indexDistal',
      leftMiddleProximal: 'leftHand.middleProximal',
      leftMiddleIntermediate: 'leftHand.middleIntermediate',
      leftMiddleDistal: 'leftHand.middleDistal',
      leftRingProximal: 'leftHand.ringProximal',
      leftRingIntermediate: 'leftHand.ringIntermediate',
      leftRingDistal: 'leftHand.ringDistal',
      leftLittleProximal: 'leftHand.littleProximal',
      leftLittleIntermediate: 'leftHand.littleIntermediate',
      leftLittleDistal: 'leftHand.littleDistal',
      rightThumbProximal: 'rightHand.thumbProximal',
      rightThumbIntermediate: 'rightHand.thumbIntermediate',
      rightThumbDistal: 'rightHand.thumbDistal',
      rightIndexProximal: 'rightHand.indexProximal',
      rightIndexIntermediate: 'rightHand.indexIntermediate',
      rightIndexDistal: 'rightHand.indexDistal',
      rightMiddleProximal: 'rightHand.middleProximal',
      rightMiddleIntermediate: 'rightHand.middleIntermediate',
      rightMiddleDistal: 'rightHand.middleDistal',
      rightRingProximal: 'rightHand.ringProximal',
      rightRingIntermediate: 'rightHand.ringIntermediate',
      rightRingDistal: 'rightHand.ringDistal',
      rightLittleProximal: 'rightHand.littleProximal',
      rightLittleIntermediate: 'rightHand.littleIntermediate',
      rightLittleDistal: 'rightHand.littleDistal'
    };

    Object.entries(jointsToAnimate).forEach(([jointKey, jsonPath]) => {
      const node = this.joints[jointKey];
      if (!node) return;

      const qPrev = this._getBoneRotation(prevFrame, jsonPath);
      const qNext = this._getBoneRotation(nextFrame, jsonPath);

      if (qPrev && qNext) {
        node.quaternion.copy(qPrev).slerp(qNext, alpha);
      }
    });
  }
}
export default SignPlayer;
