uniform mat4 u_projectionMatrix;

attribute vec4 a_position;
attribute vec2 a_uv;
attribute vec3 a_transform;
attribute float a_textureIdx;

varying vec2 v_uv;
varying float v_textureIdx;

// taken from https://gist.github.com/onedayitwillmake/3288507
mat4 rotationZ( in float angle ) {
  return mat4(
    cos(angle),	-sin(angle), 0.0, 0.0,
    sin(angle),	 cos(angle), 0.0,	0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

void main () {
  vec4 offset = vec4(a_transform.xy, 0.0, 1.0);
  float rotation = a_transform.z;
  gl_Position = u_projectionMatrix * (offset + rotationZ(rotation) * a_position);
  
  v_uv = a_uv;
  v_textureIdx = a_textureIdx;
}
