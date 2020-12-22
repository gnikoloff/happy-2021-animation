interface ShaderOptions {
  shaderType: number,
  shaderSource: string,
}
function makeShader(gl: WebGLRenderingContext, { shaderType, shaderSource }: ShaderOptions): WebGLShader {
  const shader = gl.createShader(shaderType)
  gl.shaderSource(shader, shaderSource)
  gl.compileShader(shader)
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  if (success) {
    return shader
  }
  console.error(`
    Error in ${shaderType === gl.VERTEX_SHADER ? 'vertex' : 'fragment'} shader:
    ${gl.getShaderInfoLog(shader)}
  `)
  gl.deleteShader(shader)
}

interface WebGLProgramOptions {
  vertexShaderSource: string,
  fragmentShaderSource: string,
}
export function makeProgram(gl: WebGLRenderingContext, { vertexShaderSource, fragmentShaderSource }: WebGLProgramOptions): WebGLProgram {
  const vertexShader = makeShader(gl, {
    shaderType: gl.VERTEX_SHADER,
    shaderSource: vertexShaderSource,
  })
  const fragmentShader = makeShader(gl, {
    shaderType: gl.FRAGMENT_SHADER,
    shaderSource: fragmentShaderSource,
  })
  const program = gl.createProgram()
  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)
  const success = gl.getProgramParameter(program, gl.LINK_STATUS)
  if (success) {
    return program
  }
  console.error(gl.getProgramInfoLog(program))
  gl.deleteProgram(program)
}

const extensionsMap = new Map()
export function getExtension(gl: WebGLRenderingContext, extensionName: string) {
  let extension = extensionsMap.get(extensionName)
  if (!extension) {
    extension = gl.getExtension(extensionName)
    extensionsMap.set(extensionName, extension)
  }
  return extension
}
