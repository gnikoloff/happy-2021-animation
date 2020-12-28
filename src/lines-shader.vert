uniform mat4 u_projectionMatrix;
    
attribute vec4 a_position;
attribute vec4 a_offset;
attribute float a_rotation;

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
  gl_Position = u_projectionMatrix * (a_offset + a_position * rotationZ(a_rotation));
}
