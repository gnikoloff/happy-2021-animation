precision highp float;

uniform mat4 u_projectionMatrix;

attribute vec4 a_offset;
attribute vec2 a_uv;
attribute vec4 a_position;

varying vec2 v_uv;

void main () {
  gl_Position = u_projectionMatrix * (a_offset + a_position);

  v_uv = a_uv;
}
