import * as THREE from 'three';
import { Landmark } from '../hooks/useHandTracking.ts';

export class GestureMapper {
  public alpha: number;
  public isMirrored: boolean;
  public history: { [boneKey: string]: THREE.Quaternion } = {};

  constructor(smoothingAlpha = 0.18, isMirrored = true) {
    this.alpha = smoothingAlpha;
    this.isMirrored = isMirrored;
  }

  public setMirrored(isMirrored: boolean) {
    this.isMirrored = isMirrored;
  }

  public setSmoothing(alpha: number) {
    this.alpha = THREE.MathUtils.clamp(alpha, 0.01, 1.0);
  }

  private _smoothQuaternion(boneKey: string, targetQuat: THREE.Quaternion): THREE.Quaternion {
    if (!this.history[boneKey]) {
      this.history[boneKey] = targetQuat.clone();
    } else {
      this.history[boneKey].slerp(targetQuat, this.alpha);
    }
    return this.history[boneKey].clone();
  }

  private _getSegment(lm: Landmark[], fromIdx: number, toIdx: number): THREE.Vector3 {
    const p1 = lm[fromIdx];
    const p2 = lm[toIdx];
    return new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z).normalize();
  }

  private _getJointRotation(v1: THREE.Vector3, v2: THREE.Vector3, maxAngle = Math.PI / 2): THREE.Quaternion {
    const dot = THREE.MathUtils.clamp(v1.dot(v2), -1.0, 1.0);
    let angle = Math.acos(dot);
    angle = THREE.MathUtils.clamp(angle, 0, maxAngle);
    return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), angle);
  }

  public mapLandmarks(landmarks: Landmark[], side: 'left' | 'right' = 'right'): { [boneName: string]: THREE.Quaternion } | null {
    if (!landmarks || landmarks.length < 21) return null;

    const rotations: { [boneName: string]: THREE.Quaternion } = {};
    const prefix = side;

    // 1. Calculate Palm / Wrist Rotation
    const forward = this._getSegment(landmarks, 0, 9);
    let sideVec = this._getSegment(landmarks, 5, 17);
    
    if (this.isMirrored) {
      sideVec.multiplyScalar(-1);
    }

    const normal = new THREE.Vector3().crossVectors(forward, sideVec).normalize();
    const orthoSide = new THREE.Vector3().crossVectors(normal, forward).normalize();
    const matrix = new THREE.Matrix4().makeBasis(orthoSide, forward, normal);
    const palmQuat = new THREE.Quaternion().setFromRotationMatrix(matrix);

    const offsetQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, side === 'left' ? -Math.PI / 2 : Math.PI / 2, 0)
    );
    const finalWristQuat = palmQuat.multiply(offsetQuat);
    rotations[`${prefix}Hand`] = this._smoothQuaternion(`${prefix}Hand`, finalWristQuat);

    // 2. Map Fingers
    const fingerMappings = {
      thumb: { joints: [1, 2, 3, 4], name: 'Thumb' },
      index: { joints: [5, 6, 7, 8], name: 'Index' },
      middle: { joints: [9, 10, 11, 12], name: 'Middle' },
      ring: { joints: [13, 14, 15, 16], name: 'Ring' },
      little: { joints: [17, 18, 19, 20], name: 'Little' }
    };

    Object.entries(fingerMappings).forEach(([key, value]) => {
      const idx = value.joints;
      const fName = value.name;

      const segPalmToProximal = this._getSegment(landmarks, 0, idx[0]);
      const segProximal = this._getSegment(landmarks, idx[0], idx[1]);
      const segIntermediate = this._getSegment(landmarks, idx[1], idx[2]);
      const segDistal = this._getSegment(landmarks, idx[2], idx[3]);

      const qProximal = this._getJointRotation(segPalmToProximal, segProximal, Math.PI / 2.2);
      const qIntermediate = this._getJointRotation(segProximal, segIntermediate, Math.PI / 2);
      const qDistal = this._getJointRotation(segIntermediate, segDistal, Math.PI / 2);

      const bonePrefix = `${prefix}${fName}`;
      rotations[`${bonePrefix}Proximal`] = this._smoothQuaternion(`${bonePrefix}Proximal`, qProximal);
      rotations[`${bonePrefix}Intermediate`] = this._smoothQuaternion(`${bonePrefix}Intermediate`, qIntermediate);
      rotations[`${bonePrefix}Distal`] = this._smoothQuaternion(`${bonePrefix}Distal`, qDistal);
    });

    return rotations;
  }

  public clearHistory() {
    this.history = {};
  }
}
export default GestureMapper;
