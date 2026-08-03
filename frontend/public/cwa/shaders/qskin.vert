/* CWASA WebGL Quaternion Skinning Vertex Shader */
/* Substitutions applied by CWASA engine before compilation:
 * ___N_BONES___  -> actual bone count
 * ___DO_TWIST___ -> 1 or 0
 * ___USE_TXTR___ -> 1 or 0
 */

#define N_BONES  ___N_BONES___
#define DO_TWIST ___DO_TWIST___
#define USE_TXTR ___USE_TXTR___

/* Vertex attributes */
attribute vec3 BindPos;
attribute vec3 BindNorm;
attribute vec4 BoneIxs;
attribute vec4 BoneWeights;

#if DO_TWIST
attribute vec4 BoneTwists;
#endif

attribute vec2 VSTexCoord0;

/* Morph target offsets (slots A, B, C, D) */
attribute vec3 MorphPosA;
attribute vec3 MorphNormA;
attribute vec3 MorphPosB;
attribute vec3 MorphNormB;
attribute vec3 MorphPosC;
attribute vec3 MorphNormC;
attribute vec3 MorphPosD;
attribute vec3 MorphNormD;

/* Uniforms */
uniform mat4 ModelViewMat;
uniform mat4 ModelViewProjMat;

#if USE_TXTR
uniform sampler2D SkelXforms;
uniform int       SkelXformsWidth;
uniform int       SkelXformsHeight;
#if DO_TWIST
uniform sampler2D BoneTwistData;
uniform int       BoneTwistWidth;
uniform int       BoneTwistHeight;
#endif
#else
uniform vec4 SkelXforms[N_BONES * 4];
#if DO_TWIST
uniform vec4 BoneTwistData[N_BONES];
#endif
#endif

uniform vec4 MorphWeights;
uniform sampler2D Texture;

/* Fragment shader outputs */
varying vec2  vTexCoord;
varying float vDiffuse;

/* Quaternion & TRX helper math */
vec3 quatRotate(vec4 q, vec3 p) {
    vec3 qv = q.xyz;
    float qw = q.w;
    vec3 t = 2.0 * cross(qv, p);
    return p + qw * t + cross(qv, t);
}

vec3 applyTRX(vec3 t, vec4 r, vec3 p) {
    return quatRotate(r, p) + t;
}

#if USE_TXTR
void fetchBoneTRX(int bIdx,
                  out vec3 ibpT, out vec4 ibpR,
                  out vec3 curT, out vec4 curR) {
    float row = (float(bIdx) + 0.5) / float(SkelXformsHeight);
    ibpT = texture2D(SkelXforms, vec2(0.125, row)).xyz;
    ibpR = texture2D(SkelXforms, vec2(0.375, row));
    curT = texture2D(SkelXforms, vec2(0.625, row)).xyz;
    curR = texture2D(SkelXforms, vec2(0.875, row));
}
#else
void fetchBoneTRX(int bIdx,
                  out vec3 ibpT, out vec4 ibpR,
                  out vec3 curT, out vec4 curR) {
    int base = bIdx * 4;
    ibpT = SkelXforms[base + 0].xyz;
    ibpR = SkelXforms[base + 1];
    curT = SkelXforms[base + 2].xyz;
    curR = SkelXforms[base + 3];
}
#endif

vec3 skinContrib(vec3 bindPos, vec3 bindNorm,
                 int bIdx, float weight,
                 inout vec3 normAccum) {
    vec3 ibpT; vec4 ibpR;
    vec3 curT; vec4 curR;
    fetchBoneTRX(bIdx, ibpT, ibpR, curT, curR);

    vec3 localPos  = applyTRX(ibpT, ibpR, bindPos);
    vec3 localNorm = quatRotate(ibpR, bindNorm);

    vec3 worldPos  = applyTRX(curT, curR, localPos);
    vec3 worldNorm = quatRotate(curR, localNorm);

    normAccum += weight * worldNorm;
    return weight * worldPos;
}

void main() {
    /* Morph blending */
    vec3 pos  = BindPos
        + MorphWeights.x * MorphPosA + MorphWeights.y * MorphPosB
        + MorphWeights.z * MorphPosC + MorphWeights.w * MorphPosD;

    vec3 norm = BindNorm
        + MorphWeights.x * MorphNormA + MorphWeights.y * MorphNormB
        + MorphWeights.z * MorphNormC + MorphWeights.w * MorphNormD;

    /* Bone skinning */
    vec3 skinnedPos  = vec3(0.0);
    vec3 skinnedNorm = vec3(0.0);

    float w0 = BoneWeights.x;
    float w1 = BoneWeights.y;
    float w2 = BoneWeights.z;
    float w3 = BoneWeights.w;

    if (w0 > 0.0) skinnedPos += skinContrib(pos, norm, int(BoneIxs.x), w0, skinnedNorm);
    if (w1 > 0.0) skinnedPos += skinContrib(pos, norm, int(BoneIxs.y), w1, skinnedNorm);
    if (w2 > 0.0) skinnedPos += skinContrib(pos, norm, int(BoneIxs.z), w2, skinnedNorm);
    if (w3 > 0.0) skinnedPos += skinContrib(pos, norm, int(BoneIxs.w), w3, skinnedNorm);

    float totalWeight = w0 + w1 + w2 + w3;
    if (totalWeight <= 0.0) {
        skinnedPos = pos;
        skinnedNorm = norm;
    }

    /* Lighting */
    vec3 lightDir = normalize(vec3(0.4, 1.0, 0.7));
    vec3 eyeNorm  = normalize(mat3(ModelViewMat) * normalize(skinnedNorm));
    vDiffuse = clamp(dot(eyeNorm, lightDir), 0.0, 1.0) * 0.7 + 0.3;

    vTexCoord   = VSTexCoord0;
    gl_Position = ModelViewProjMat * vec4(skinnedPos, 1.0);
}
