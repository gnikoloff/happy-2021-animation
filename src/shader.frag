precision highp float;

varying vec2 v_uv;

void main () {
  float dist = distance(v_uv, vec2(0.5));
  float c = 1.0 - smoothstep(0.475, 0.525, dist);
  gl_FragColor = vec4(v_uv, 0.0, c);
}
