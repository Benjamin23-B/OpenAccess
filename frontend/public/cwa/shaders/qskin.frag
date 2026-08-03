/* CWASA qskin.frag - Quaternion Skinning Fragment Shader */
precision mediump float;

varying vec2 vTexCoord;
varying float vDiffuse;

uniform sampler2D Texture;

void main() {
    vec4 texColor = texture2D(Texture, vTexCoord);
    if (texColor.a < 0.01) discard;
    gl_FragColor = vec4(texColor.rgb * vDiffuse, texColor.a);
}
