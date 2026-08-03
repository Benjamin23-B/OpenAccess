/* CWASA WebGL Fragment Shader */
precision mediump float;

varying vec3 vNormal;
varying vec2 vTexCoord;

uniform sampler2D uTexture;

void main() {
    vec3 lightDir = normalize(vec3(0.5, 0.75, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.35);
    vec4 texColor = texture2D(uTexture, vTexCoord);
    
    if (texColor.a < 0.05) {
        texColor = vec4(0.82, 0.85, 0.90, 1.0);
    }
    
    gl_FragColor = vec4(texColor.rgb * diff, texColor.a);
}
