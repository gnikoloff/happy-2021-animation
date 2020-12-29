precision highp float;

varying vec2 v_uv;

uniform bool u_debugMode;

void main () {
  if (u_debugMode) {
    gl_FragColor = vec4(vec3(0.2), 1.0);
  } else {
    float dist = distance(v_uv, vec2(0.5));
    // float c = 1.0 - smoothstep(0.475, 0.525, dist);
    float c = 0.5 - dist;
    gl_FragColor = vec4(vec3(1.0), c);
  }
}
