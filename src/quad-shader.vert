precision highp float;

attribute vec4 a_position;
attribute vec2 a_uv;

varying vec2 v_uv;

void main () {
  gl_Position = a_position;

  v_uv = a_uv;
}
  