precision highp float;

#pragma glslify: grain = require(glsl-film-grain) 

uniform sampler2D u_targetTexture;
uniform vec2 u_resolution;
uniform float u_borderRadius;

varying vec2 v_uv;
void main () {
  vec4 inputColor = texture2D(u_targetTexture, v_uv);
  // gl_FragColor = inputColor;

  float cutoff = 0.325;

  // vec4 fillColor = inputColor;
  // vec4 metaBallsColor = vec4(0.529, 0.635, 0.639, step(cutoff, inputColor.b));
  // vec4 metaBallsStroke = vec4(0.717, 0.784, 0.807, step(cutoff + u_borderRadius, inputColor.b));

  vec4 metaBallsColor = vec4(0.0, 0.0, 1.0, smoothstep(cutoff - 0.01, cutoff + 0.01, inputColor.b));
  vec4 metaBallsStroke = vec4(0.0, 0.0, 1.0, step(cutoff + u_borderRadius, inputColor.b));
  
  float grainSize = 1.0;
  float g = grain(v_uv, u_resolution / 2.0);

  vec4 grainColor = vec4(g);

  metaBallsColor = mix(metaBallsColor, grainColor, metaBallsColor.a * grainColor.a * 0.25);
  metaBallsColor = mix(metaBallsColor, metaBallsStroke, metaBallsStroke.a);
  
  gl_FragColor = metaBallsColor;
  
}
