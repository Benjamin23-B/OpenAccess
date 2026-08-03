/* CWASA WebGL Quaternion Skinning Vertex Shader */
#define N_BONES 100
#define DO_TWIST 1
#define USE_TXTR 1

attribute vec3 mcPosition;
attribute vec3 mcNormal;
attribute vec2 mcTexCoord;
attribute vec4 mcBoneIxs;
attribute vec4 mcBoneWeights;

uniform mat4 uMVMatrix;
uniform mat4 uMVPMatrix;
uniform mat4 uBones[N_BONES];

varying vec3 vNormal;
varying vec2 vTexCoord;

void main() {
    vec4 pos = vec4(mcPosition, 1.0);
    vec4 skinnedPos = vec4(0.0);
    vec3 skinnedNorm = vec3(0.0);

    float totalWeight = mcBoneWeights.x + mcBoneWeights.y + mcBoneWeights.z + mcBoneWeights.w;
    if (totalWeight > 0.0) {
        for (int i = 0; i < 4; i++) {
            int bIdx = int(mcBoneIxs[i]);
            float w = mcBoneWeights[i];
            if (w > 0.0) {
                mat4 bMat = uBones[bIdx];
                skinnedPos += (bMat * pos) * w;
                skinnedNorm += (mat3(bMat) * mcNormal) * w;
            }
        }
    } else {
        skinnedPos = pos;
        skinnedNorm = mcNormal;
    }

    vNormal = normalize(mat3(uMVMatrix) * skinnedNorm);
    vTexCoord = mcTexCoord;
    gl_Position = uMVPMatrix * skinnedPos;
}
