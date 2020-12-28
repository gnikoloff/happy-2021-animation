precision highp float;

uniform sampler2D u_texture;

varying vec2 v_uv;

void main () {
  vec4 inputColor = texture2D(u_texture, v_uv);
  // gl_FragColor = inputColor;
  float c = step(0.25, inputColor.r);
  gl_FragColor = mix(vec4(1.0, 0.0, 0.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0), c);
}
