import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

interface JointState {
  current: THREE.Quaternion;
  target: THREE.Quaternion;
  source: THREE.Quaternion;
  t: number;
  duration: number;
}

export class SignAnimationController {
  public vrm: VRM;
  public speed: number = 1.0;
  public joints: { [name: string]: THREE.Object3D } = {};
  public states: { [name: string]: JointState } = {};

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.cacheBones();
    this.initStates();
  }

  private cacheBones() {
    if (!this.vrm || !this.vrm.humanoid) return;

    const boneNames = [
      // Left Arm
      'leftUpperArm', 'leftLowerArm', 'leftHand',
      // Right Arm
      'rightUpperArm', 'rightLowerArm', 'rightHand',
      // Left Fingers
      'leftThumbProximal', 'leftThumbIntermediate', 'leftThumbDistal',
      'leftIndexProximal', 'leftIndexIntermediate', 'leftIndexDistal',
      'leftMiddleProximal', 'leftMiddleIntermediate', 'leftMiddleDistal',
      'leftRingProximal', 'leftRingIntermediate', 'leftRingDistal',
      'leftLittleProximal', 'leftLittleIntermediate', 'leftLittleDistal',
      // Right Fingers
      'rightThumbProximal', 'rightThumbIntermediate', 'rightThumbDistal',
      'rightIndexProximal', 'rightIndexIntermediate', 'rightIndexDistal',
      'rightMiddleProximal', 'rightMiddleIntermediate', 'rightMiddleDistal',
      'rightRingProximal', 'rightRingIntermediate', 'rightRingDistal',
      'rightLittleProximal', 'rightLittleIntermediate', 'rightLittleDistal'
    ];

    boneNames.forEach((name) => {
      const node = this.vrm.humanoid!.getNormalizedBoneNode(name as any);
      if (node) {
        this.joints[name] = node;
      }
    });
  }

  private initStates() {
    Object.keys(this.joints).forEach((name) => {
      const node = this.joints[name];
      this.states[name] = {
        current: node.quaternion.clone(),
        target: node.quaternion.clone(),
        source: node.quaternion.clone(),
        t: 1.0,
        duration: 0.35,
      };
    });
  }

  public setSpeed(speed: number) {
    this.speed = speed;
  }

  public animateJoint(boneName: string, targetRot: any, duration = 0.35) {
    const state = this.states[boneName];
    if (!state || !this.joints[boneName]) return;

    state.source.copy(this.joints[boneName].quaternion);

    if (targetRot instanceof THREE.Quaternion) {
      state.target.copy(targetRot);
    } else if (targetRot instanceof THREE.Euler) {
      state.target.setFromEuler(targetRot);
    } else if (Array.isArray(targetRot)) {
      state.target.setFromEuler(new THREE.Euler(targetRot[0], targetRot[1], targetRot[2]));
    } else if (typeof targetRot === 'object') {
      state.target.setFromEuler(
        new THREE.Euler(targetRot.x || 0, targetRot.y || 0, targetRot.z || 0)
      );
    }

    state.t = 0.0;
    state.duration = Math.max(0.01, duration);
  }

  public animateArm(side: 'left' | 'right', shoulderRot?: any, elbowRot?: any, wristRot?: any, duration = 0.4) {
    const prefix = side;
    if (shoulderRot !== undefined) this.animateJoint(`${prefix}UpperArm`, shoulderRot, duration);
    if (elbowRot !== undefined) this.animateJoint(`${prefix}LowerArm`, elbowRot, duration);
    if (wristRot !== undefined) this.animateJoint(`${prefix}Hand`, wristRot, duration);
  }

  public animateFinger(side: 'left' | 'right', fingerName: string, jointRotations: { proximal?: any; intermediate?: any; distal?: any }, duration = 0.3) {
    const prefix = side;
    const fName = fingerName.charAt(0).toUpperCase() + fingerName.slice(1);

    if (jointRotations.proximal !== undefined) {
      this.animateJoint(`${prefix}${fName}Proximal`, jointRotations.proximal, duration);
    }
    if (jointRotations.intermediate !== undefined) {
      this.animateJoint(`${prefix}${fName}Intermediate`, jointRotations.intermediate, duration);
    }
    if (jointRotations.distal !== undefined) {
      this.animateJoint(`${prefix}${fName}Distal`, jointRotations.distal, duration);
    }
  }

  public animatePose(poseData: { [boneName: string]: any }, duration = 0.4) {
    Object.entries(poseData).forEach(([boneName, rotation]) => {
      if (this.states[boneName]) {
        this.animateJoint(boneName, rotation, duration);
      }
    });
  }

  public resetPose(duration = 0.5) {
    const identity = new THREE.Quaternion();
    Object.keys(this.joints).forEach((name) => {
      this.animateJoint(name, identity, duration);
    });
  }

  public update(delta: number) {
    const speedAdjustedDelta = delta * this.speed;

    Object.keys(this.states).forEach((name) => {
      const state = this.states[name];
      const node = this.joints[name];

      if (state.t < 1.0) {
        state.t += speedAdjustedDelta / state.duration;
        if (state.t > 1.0) state.t = 1.0;

        node.quaternion.copy(state.source).slerp(state.target, state.t);
        state.current.copy(node.quaternion);
      } else {
        node.quaternion.copy(state.target);
      }
    });
  }
}
