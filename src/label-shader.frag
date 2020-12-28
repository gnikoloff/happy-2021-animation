#define numTextures 3

precision highp float;

uniform sampler2D u_texturesArray[numTextures];

varying vec2 v_uv;
varying float v_textureIdx;

vec4 getSampleFromArray(sampler2D textures[numTextures], int ndx, vec2 uv) {
  vec4 color = vec4(0);
  for (int i = 0; i < numTextures; ++i) {
    vec4 c = texture2D(textures[i], uv);
    if (i == ndx) {
      color += c;
    }
  }
  return color;
}

void main () {
  gl_FragColor = getSampleFromArray(u_texturesArray, int(v_textureIdx), v_uv);
}
