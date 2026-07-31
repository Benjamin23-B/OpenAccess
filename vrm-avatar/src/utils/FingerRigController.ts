import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';

interface JointState {
  current: THREE.Quaternion;
  target: THREE.Quaternion;
  source: THREE.Quaternion;
  t: number;
  duration: number;
}

export class FingerRigController {
  public vrm: VRM;
  public joints: { [name: string]: THREE.Object3D } = {};
  public states: { [name: string]: JointState } = {};

  constructor(vrm: VRM) {
    this.vrm = vrm;
    this.cacheFingerBones();
    this.initStates();
  }

  private cacheFingerBones() {
    if (!this.vrm || !this.vrm.humanoid) return;

    const sides = ['left', 'right'];
    const fingers = ['thumb', 'index', 'middle', 'ring', 'little'];
    const joints = ['Proximal', 'Intermediate', 'Distal'];

    sides.forEach((side) => {
      fingers.forEach((finger) => {
        joints.forEach((joint) => {
          const boneName = `${side}${finger.charAt(0).toUpperCase() + finger.slice(1)}${joint}`;
          const node = this.vrm.humanoid!.getNormalizedBoneNode(boneName as any);
          if (node) {
            this.joints[boneName] = node;
          }
        });
      });
    });
  }

  private initStates() {
    Object.keys(this.joints).forEach((boneName) => {
      const node = this.joints[boneName];
      this.states[boneName] = {
        current: node.quaternion.clone(),
        target: node.quaternion.clone(),
        source: node.quaternion.clone(),
        t: 1.0,
        duration: 0.35,
      };
    });
  }

  private _parseRotation(rotation: any): THREE.Quaternion {
    if (rotation instanceof THREE.Quaternion) {
      return rotation.clone();
    } else if (rotation instanceof THREE.Euler) {
      return new THREE.Quaternion().setFromEuler(rotation);
    } else if (Array.isArray(rotation)) {
      return new THREE.Quaternion().setFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
    } else if (typeof rotation === 'object') {
      return new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotation.x || 0, rotation.y || 0, rotation.z || 0)
      );
    }
    return new THREE.Quaternion();
  }

  public setFingerJoint(side: 'left' | 'right', fingerName: string, jointName: string, targetRotation: any, duration = 0.3) {
    const fName = fingerName.charAt(0).toUpperCase() + fingerName.slice(1);
    const jName = jointName.charAt(0).toUpperCase() + jointName.slice(1);
    const boneName = `${side}${fName}${jName}`;

    const state = this.states[boneName];
    if (!state || !this.joints[boneName]) return;

    state.source.copy(this.joints[boneName].quaternion);
    state.target.copy(this._parseRotation(targetRotation));
    state.t = 0.0;
    state.duration = Math.max(0.01, duration);
  }

  public setFingerJoints(side: 'left' | 'right', fingerName: string, rotations: { [jointName: string]: any }, duration = 0.3) {
    Object.entries(rotations).forEach(([jointName, rotation]) => {
      this.setFingerJoint(side, fingerName, jointName, rotation, duration);
    });
  }

  public setHandPose(side: 'left' | 'right', poseData: { [fingerName: string]: any }, duration = 0.3) {
    Object.entries(poseData).forEach(([fingerName, rotations]) => {
      this.setFingerJoints(side, fingerName, rotations, duration);
    });
  }

  public blendHandPose(side: 'left' | 'right', sourcePose: any, targetPose: any, alpha: number) {
    const fingers = ['thumb', 'index', 'middle', 'ring', 'little'];
    const joints = ['proximal', 'intermediate', 'distal'];

    fingers.forEach((finger) => {
      joints.forEach((joint) => {
        const fName = finger.charAt(0).toUpperCase() + finger.slice(1);
        const jName = joint.charAt(0).toUpperCase() + joint.slice(1);
        const boneName = `${side}${fName}${jName}`;

        const node = this.joints[boneName];
        if (!node) return;

        const srcRot = sourcePose[finger]?.[joint];
        const tgtRot = targetPose[finger]?.[joint];

        if (srcRot !== undefined && tgtRot !== undefined) {
          const qSrc = this._parseRotation(srcRot);
          const qTgt = this._parseRotation(tgtRot);
          
          node.quaternion.copy(qSrc).slerp(qTgt, THREE.MathUtils.clamp(alpha, 0, 1));
          
          const state = this.states[boneName];
          if (state) {
            state.current.copy(node.quaternion);
            state.target.copy(node.quaternion);
            state.source.copy(node.quaternion);
            state.t = 1.0;
          }
        }
      });
    });
  }

  public resetHand(side: 'left' | 'right', duration = 0.4) {
    const identity = new THREE.Quaternion();
    const fingers = ['thumb', 'index', 'middle', 'ring', 'little'];
    const joints = ['proximal', 'intermediate', 'distal'];

    fingers.forEach((finger) => {
      joints.forEach((joint) => {
        this.setFingerJoint(side, finger, joint, identity, duration);
      });
    });
  }

  public update(delta: number, speedMultiplier = 1.0) {
    const speedAdjustedDelta = delta * speedMultiplier;

    Object.keys(this.states).forEach((boneName) => {
      const state = this.states[boneName];
      const node = this.joints[boneName];

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
export default FingerRigController;
