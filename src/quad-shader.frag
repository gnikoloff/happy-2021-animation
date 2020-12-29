precision highp float;

#pragma glslify: grain = require(glsl-film-grain) 

uniform sampler2D u_targetTexture;
uniform vec2 u_resolution;

varying vec2 v_uv;
void main () {
  vec4 inputColor = texture2D(u_targetTexture, v_uv);
  // gl_FragColor = inputColor;

  float cutoff = 0.325;

  // vec4 fillColor = inputColor;
  vec4 metaBallsColor = vec4(1.0, 0.0, 0.0, step(cutoff, inputColor.b));
  vec4 metaBallsStroke = vec4(0.0, 1.0, 0.0, step(cutoff + 0.25, inputColor.b));
  
  float grainSize = 1.0;
  float g = grain(v_uv, u_resolution / 2.0);

  vec4 grainColor = vec4(g);

  metaBallsColor = mix(metaBallsColor, grainColor, metaBallsColor.a * grainColor.a * 0.25);
  metaBallsColor = mix(metaBallsColor, metaBallsStroke, metaBallsStroke.a);
  
  gl_FragColor = metaBallsColor;
  
}
