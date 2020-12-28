import 'oes-vertex-attrib-array-polyfill'

import {
  makeProgram,
  getExtension,
  orthographic,
} from './helpers'

import calculatePhysics from './calculate-physics'
import getCanvasTexture from './get-canvas-texture'

import ballsVertexShaderSource from './balls-shader.vert'
import ballsFragmentShaderSource from './balls-shader.frag'
import quadVertexShaderSource from './quad-shader.vert'
import quadFragmentShaderSource from './quad-shader.frag'
import linesVertexShaderSource from './lines-shader.vert'
import linesFragmentShaderSource from './lines-shader.frag'

// import PhysicsWorker from 'web-worker:./physics-worker'

import {
  EVT_INIT_WORLD,
  EVT_REQUEST_UPDATE_WORLD,
  EVT_UPDATED_WORLD,
} from './constants'

const GLOBAL_STATE = {
  innerWidth,
  innerHeight,
  radius: 50,
  particleCount: 50,
  linesCount: 20,
  bounceScale: 0.8,
  gravity: 0.005,
  useWorker: false,
}

const threadChooserWrapper = document.getElementsByClassName('thread-options')[0]
const appContainer = document.getElementById('canvas-container')
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl')

// ------- WebGL Extensions -------
const webglDebugExtension = getExtension(gl, 'GMAN_debug_helper')
const instanceExtension = getExtension(gl, 'ANGLE_instanced_arrays')
const vaoExtension = getExtension(gl, 'OES_vertex_array_object')
// const worker = new PhysicsWorker()

let u_targetTexture
let u_textTexture

// ------- Fullscreen quad program and geometry -------
const planeProgram = makeProgram(gl, {
  vertexShaderSource: quadVertexShaderSource,
  fragmentShaderSource: quadFragmentShaderSource,
})
webglDebugExtension.tagObject(planeProgram, 'planeProgram')

const planeVertexArray = new Float32Array([1.0, 1.0, -1.0, 1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0])
const planeUvsArray = new Float32Array([1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 1])

// Look up quad attributes location
const postFXPlanePositionLocation = gl.getAttribLocation(planeProgram, 'a_position')
const postFXPlaneUvLocation = gl.getAttribLocation(planeProgram, 'a_uv')

// Create quad buffers
const planeVertexBuffer = gl.createBuffer()
const planeUvBuffer = gl.createBuffer()

// Create quad VAO and bind it
const planeVao = vaoExtension.createVertexArrayOES()
webglDebugExtension.tagObject(planeVao, 'planeVao')
vaoExtension.bindVertexArrayOES(planeVao)

// Quad vertices
gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, planeVertexArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(postFXPlanePositionLocation)
gl.vertexAttribPointer(postFXPlanePositionLocation, 2, gl.FLOAT, false, 0, 0)

// Quad uvs
gl.bindBuffer(gl.ARRAY_BUFFER, planeUvBuffer)
gl.bufferData(gl.ARRAY_BUFFER, planeUvsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(postFXPlaneUvLocation)
gl.vertexAttribPointer(postFXPlaneUvLocation, 2, gl.FLOAT, false, 0, 0)

// Unbind quad VAO
vaoExtension.bindVertexArrayOES(null)

// ------- Hardware instanced lines program and geometry -------
const linesProgram = makeProgram(gl, {
  vertexShaderSource: linesVertexShaderSource,
  fragmentShaderSource: linesFragmentShaderSource,
})
const linesVertexArray = new Float32Array([0, 0, 300, 0])
const linesOffsetsArray = new Float32Array(GLOBAL_STATE.linesCount * 2)
const linesRotationsArray = new Float32Array(GLOBAL_STATE.linesCount)
for (let i = 0; i < GLOBAL_STATE.linesCount; i++) {
  linesOffsetsArray[i * 2 + 0] = Math.random() * innerWidth
  linesOffsetsArray[i * 2 + 1] = Math.random() * innerHeight

  linesRotationsArray[i] = (Math.random() * 2 - 1) * 45 * Math.PI / 180
}

// Look up lines program attributes
const linePositionLocation = gl.getAttribLocation(linesProgram, 'a_position')
const lineOffsetLocation = gl.getAttribLocation(linesProgram, 'a_offset')
const lineRotationLocation = gl.getAttribLocation(linesProgram, 'a_rotation')

// Create lines buffers
const linesVertexBuffer = gl.createBuffer()
webglDebugExtension.tagObject(linesVertexBuffer, 'linesVertexBuffer')
const linesOffsetsBuffer = gl.createBuffer()
webglDebugExtension.tagObject(linesOffsetsBuffer, 'linesOffsetsBuffer')
const linesRotationBuffers = gl.createBuffer()
webglDebugExtension.tagObject(linesRotationBuffers, 'linesRotationBuffers')

// Create lines VAO and bind it
const linesVao = vaoExtension.createVertexArrayOES()
webglDebugExtension.tagObject(planeVao, 'planeVao')
vaoExtension.bindVertexArrayOES(linesVao)

// Lines vertices
gl.bindBuffer(gl.ARRAY_BUFFER, linesVertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, linesVertexArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(linePositionLocation)
gl.vertexAttribPointer(linePositionLocation, 2, gl.FLOAT, false, 0, 0)

// Lines offsets
gl.bindBuffer(gl.ARRAY_BUFFER, linesOffsetsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, linesOffsetsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(lineOffsetLocation)
gl.vertexAttribPointer(lineOffsetLocation, 2, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(lineOffsetLocation, 1)

// Lines rotations
gl.bindBuffer(gl.ARRAY_BUFFER, linesRotationBuffers)
gl.bufferData(gl.ARRAY_BUFFER, linesRotationsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(lineRotationLocation)
gl.vertexAttribPointer(lineRotationLocation, 1, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(lineRotationLocation, 1)

// Unbind lines VAO
vaoExtension.bindVertexArrayOES(null)

// ------- Hardware instanced balls program and geometry -------
const ballsProgram = makeProgram(gl, {
  vertexShaderSource: ballsVertexShaderSource,
  fragmentShaderSource: ballsFragmentShaderSource,
})

const ballsVertexArray = new Float32Array([-GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2])
const ballsUvsArray = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])

let offsetsArray = new Float32Array(GLOBAL_STATE.particleCount * 2)
let oldOffsetsArray = new Float32Array(GLOBAL_STATE.particleCount * 2)
let velocitiesArray = new Float32Array(GLOBAL_STATE.particleCount * 2).fill(0)

for (let i = 0; i < GLOBAL_STATE.particleCount; i++) {
  const randX = Math.random() * GLOBAL_STATE.innerWidth
  const randY = Math.random() * -GLOBAL_STATE.innerHeight
  offsetsArray[i * 2 + 0] = randX
  offsetsArray[i * 2 + 1] = randY
  oldOffsetsArray[i * 2 + 0] = randX
  oldOffsetsArray[i * 2 + 1] = randY

  velocitiesArray[i * 2] = (Math.random() * 2 - 1) * 0.25
  velocitiesArray[i * 2 + 1] = Math.random()
}

// Create balls buffers
const ballsVertexBuffer = gl.createBuffer()
webglDebugExtension.tagObject(ballsVertexBuffer, 'ballsVertexBuffer')
const ballsUvsBuffer = gl.createBuffer()
webglDebugExtension.tagObject(ballsUvsBuffer, 'ballsUvsBuffer')
const ballsOffsetsBuffer = gl.createBuffer()
webglDebugExtension.tagObject(ballsOffsetsBuffer, 'ballsOffsetsBuffer')

// Create balls VAO
const ballsVao = vaoExtension.createVertexArrayOES()
webglDebugExtension.tagObject(ballsVao, 'ballsVao')
vaoExtension.bindVertexArrayOES(ballsVao)

// Lookup balls attributes
const ballsPositionLocation = gl.getAttribLocation(ballsProgram, 'a_position')
const ballsUvLocation = gl.getAttribLocation(ballsProgram, 'a_uv')
const ballsOffsetLocation = gl.getAttribLocation(ballsProgram, 'a_offset')

// Balls vertices
gl.bindBuffer(gl.ARRAY_BUFFER, ballsVertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, ballsVertexArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(ballsPositionLocation)
gl.vertexAttribPointer(ballsPositionLocation, 2, gl.FLOAT, false, 0, 0)

// Balls UVs
gl.bindBuffer(gl.ARRAY_BUFFER, ballsUvsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, ballsUvsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(ballsUvLocation)
gl.vertexAttribPointer(ballsUvLocation, 2, gl.FLOAT, false, 0, 0)

// Balls Instances Offsets
gl.bindBuffer(gl.ARRAY_BUFFER, ballsOffsetsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, offsetsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(ballsOffsetLocation)
gl.vertexAttribPointer(ballsOffsetLocation, 2, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(location, 1)

// Unbind balls VAO
vaoExtension.bindVertexArrayOES(null)

// ------- Create texture to render to -------
const targetTextureWidth = innerWidth
const targetTextureHeight = innerHeight
const targetTexture = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, targetTexture)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, targetTextureWidth, targetTextureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
gl.bindTexture(gl.TEXTURE_2D, null)

// ------- Create a framebuffer -------
const framebuffer = gl.createFramebuffer()
gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0)
gl.bindFramebuffer(gl.FRAMEBUFFER, null)

// ------- Create canvas texture with texts -------
const textureCanvas = getCanvasTexture({
  size: 512,
  headline: 'HAPPY 2021'
})
const textTexture = gl.createTexture()
gl.bindTexture(gl.TEXTURE_2D, textTexture)
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textureCanvas)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
gl.bindTexture(gl.TEXTURE_2D, null)


document.addEventListener('DOMContentLoaded', init)

function init() {
  threadChooserWrapper.addEventListener('click', onThreadChoose)
  appContainer.appendChild(canvas)

  resizeCanvas()
  document.body.addEventListener('resize', resizeCanvas)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const projectionMatrix = orthographic({
    left: 0,
    right: GLOBAL_STATE.innerWidth / 2,
    bottom: GLOBAL_STATE.innerHeight / 2,
    top: 0,
    near: 1,
    far: -1,
  })

  let u_projectionMatrix

  gl.useProgram(ballsProgram)
  u_projectionMatrix = gl.getUniformLocation(ballsProgram, 'u_projectionMatrix')
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.useProgram(null)

  gl.useProgram(linesProgram)
  u_projectionMatrix = gl.getUniformLocation(linesProgram, 'u_projectionMatrix')
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.useProgram(null)

  gl.useProgram(planeProgram)
  u_targetTexture = gl.getUniformLocation(planeProgram, 'u_targetTexture')
  u_textTexture = gl.getUniformLocation(planeProgram, 'u_textTexture')
  const u_resolution = gl.getUniformLocation(planeProgram, 'u_resolution')
  gl.uniform2f(u_resolution, canvas.width, canvas.height)
  const u_textTextureResolution = gl.getUniformLocation(planeProgram, 'u_textTextureResolution')
  gl.uniform2f(u_textTextureResolution, textureCanvas.width, textureCanvas.height)
  gl.useProgram(null)

  // worker.postMessage({
  //   type: EVT_INIT_WORLD,
  //   innerWidth: GLOBAL_STATE.innerWidth,
  //   innerHeight: GLOBAL_STATE.innerHeight,
  //   radius: GLOBAL_STATE.radius,
  //   particlesCount: GLOBAL_STATE.particleCount,
  //   bounceScale: GLOBAL_STATE.bounceScale,
  //   gravity: GLOBAL_STATE.gravity,
  // })

  // worker.onmessage = onWorkerMessage
  requestAnimationFrame(renderFrame)
}

// function onWorkerMessage(e) {
//   if (!GLOBAL_STATE.useWorker) {
//     return
//   }
//   if (e.data.type === EVT_UPDATED_WORLD) {
//     const {
//       velocitiesArray: newVelocitiesArray,
//       offsetsArray: newOffsetsArray,
//       oldOffsetsArray: newOldOffsetsArray,
//     } = e.data

//     velocitiesArray = newVelocitiesArray
//     offsetsArray = newOffsetsArray
//     oldOffsetsArray = newOldOffsetsArray

//     gl.bindBuffer(gl.ARRAY_BUFFER, offsetsBuffer)
//     gl.bufferData(gl.ARRAY_BUFFER, offsetsArray, gl.DYNAMIC_DRAW)
//     gl.bindBuffer(gl.ARRAY_BUFFER, null)
//   }
// }

function renderFrame() {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  vaoExtension.bindVertexArrayOES(ballsVao)
  gl.useProgram(ballsProgram)
  instanceExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, GLOBAL_STATE.particleCount)
  gl.useProgram(null)
  vaoExtension.bindVertexArrayOES(null)

  gl.bindFramebuffer(gl.FRAMEBUFFER, null)


  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  vaoExtension.bindVertexArrayOES(planeVao)
  gl.useProgram(planeProgram)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, targetTexture)
  gl.uniform1i(u_targetTexture, 0)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, textTexture)
  gl.uniform1i(u_textTexture, 1)

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  gl.bindTexture(gl.TEXTURE_2D, null)
  gl.useProgram(null)
  vaoExtension.bindVertexArrayOES(null)


  vaoExtension.bindVertexArrayOES(linesVao)
  gl.useProgram(linesProgram)
  instanceExtension.drawArraysInstancedANGLE(gl.LINES, 0, 2, GLOBAL_STATE.linesCount)
  gl.useProgram(null)
  vaoExtension.bindVertexArrayOES(null)

  if (GLOBAL_STATE.useWorker) {
    if (velocitiesArray.buffer.byteLength && offsetsArray.buffer.byteLength && oldOffsetsArray.buffer.byteLength) {
      // worker.postMessage({
      //   type: EVT_REQUEST_UPDATE_WORLD,
      //   velocitiesArray,
      //   offsetsArray,
      //   oldOffsetsArray,
      // }, [
      //   velocitiesArray.buffer,
      //   offsetsArray.buffer,
      //   oldOffsetsArray.buffer
      // ])
    }
  } else {
    // const {
    //   velocitiesArray: newVelocitiesArray,
    //   offsetsArray: newOffsetsArray,
    //   oldOffsetsArray: newOldOffsetsArray,
    // } = 
    calculatePhysics({
      velocitiesArray,
      oldOffsetsArray,
      offsetsArray,
      linesOffsetsArray,
      linesRotationsArray,
      linesVertexArray,
    }, {
      innerWidth: GLOBAL_STATE.innerWidth,
      innerHeight: GLOBAL_STATE.innerHeight,
      radius: GLOBAL_STATE.radius,
      particlesCount: GLOBAL_STATE.particleCount,
      bounceScale: GLOBAL_STATE.bounceScale,
      gravity: GLOBAL_STATE.gravity,
    })

    // velocitiesArray = newVelocitiesArray
    // offsetsArray = newOffsetsArray
    // oldOffsetsArray = newOldOffsetsArray

    gl.bindBuffer(gl.ARRAY_BUFFER, ballsOffsetsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, offsetsArray, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  requestAnimationFrame(renderFrame)
}

// ------- Helpers -------

function onThreadChoose(e) {
  if (e.target.nodeName === 'BUTTON') {
    for (let i = 0; i < threadChooserWrapper.children.length; i++) {
      const btn = threadChooserWrapper.children[i]
      btn.classList.remove('active')
    }
    const { option } = e.target.dataset
    e.target.classList.add('active')
    GLOBAL_STATE.useWorker = option === 'worker-thread'
  }
}

function resizeCanvas() {
  const dpr = 1
  canvas.width = GLOBAL_STATE.innerWidth * dpr
  canvas.height = GLOBAL_STATE.innerHeight * dpr
  canvas.style.width = `${GLOBAL_STATE.innerWidth}px`
  canvas.style.height = `${GLOBAL_STATE.innerHeight}px`
}
