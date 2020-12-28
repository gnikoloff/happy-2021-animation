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

// import PhysicsWorker from 'web-worker:./physics-worker'

import {
  EVT_INIT_WORLD,
  EVT_REQUEST_UPDATE_WORLD,
  EVT_UPDATED_WORLD,
} from './constants'

const GLOBAL_STATE = {
  innerWidth,
  innerHeight,
  radius: 180,
  particleCount: 250,
  bounceScale: 0.8,
  gravity: 0.9,
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

let u_texture

// ------- Fullscreen quad program and geometry -------
const planeProgram = makeProgram(gl, {
  vertexShaderSource: quadVertexShaderSource,
  fragmentShaderSource: quadFragmentShaderSource,
})
webglDebugExtension.tagObject(planeProgram, 'planeProgram')

const planeVertexArray = new Float32Array([
  1.0, 1.0,
  -1.0, 1.0,
  -1.0, -1.0,
  -1.0, -1.0,
  1.0, -1.0,
  1.0, 1.0
])
const planeUvsArray = new Float32Array([
  1, 1,
  0, 1,
  0, 0,
  0, 0,
  1, 0,
  1, 1,
])

const planeVao = vaoExtension.createVertexArrayOES()
webglDebugExtension.tagObject(planeVao, 'planeVao')
vaoExtension.bindVertexArrayOES(planeVao)

const postFXPlanePositionLocation = gl.getAttribLocation(planeProgram, 'a_position')
const planeVertexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, planeVertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, planeVertexArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(postFXPlanePositionLocation)
gl.vertexAttribPointer(postFXPlanePositionLocation, 2, gl.FLOAT, false, 0, 0)

const postFXPlaneUvLocation = gl.getAttribLocation(planeProgram, 'a_uv')
const planeUvBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, planeUvBuffer)
gl.bufferData(gl.ARRAY_BUFFER, planeUvsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(postFXPlaneUvLocation)
gl.vertexAttribPointer(postFXPlaneUvLocation, 2, gl.FLOAT, false, 0, 0)

vaoExtension.bindVertexArrayOES(null)

// ------- Hardware instanced balls program and geometry -------
const ballsProgram = makeProgram(gl, {
  vertexShaderSource: ballsVertexShaderSource,
  fragmentShaderSource: ballsFragmentShaderSource,
})

const ballsVertexArray = new Float32Array([-GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2])
const ballsUvsArray = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])

let offsetsArray
let oldOffsetsArray
let velocitiesArray
let oldTime = 0

offsetsArray = new Float32Array(GLOBAL_STATE.particleCount * 2)
oldOffsetsArray = new Float32Array(GLOBAL_STATE.particleCount * 2)
velocitiesArray = new Float32Array(GLOBAL_STATE.particleCount * 2).fill(0)

for (let i = 0; i < GLOBAL_STATE.particleCount; i++) {
  const randX = Math.random() * GLOBAL_STATE.innerWidth
  const randY = Math.random() * GLOBAL_STATE.innerHeight
  offsetsArray[i * 2 + 0] = randX
  offsetsArray[i * 2 + 1] = randY
  oldOffsetsArray[i * 2 + 0] = randX
  oldOffsetsArray[i * 2 + 1] = randY

  velocitiesArray[i * 2] = (Math.random() * 2 - 1) * 100
  velocitiesArray[i * 2 + 1] = Math.random() * 3 + 1
}

const ballsVao = vaoExtension.createVertexArrayOES()
webglDebugExtension.tagObject(ballsVao, 'ballsVao')

vaoExtension.bindVertexArrayOES(ballsVao)

const ballsAttribsLocations = {}
// Balls vertices
const ballsVertexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, ballsVertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, ballsVertexArray, gl.STATIC_DRAW)
ballsAttribsLocations['a_position'] = gl.getAttribLocation(ballsProgram, 'a_position')
gl.enableVertexAttribArray(ballsAttribsLocations['a_position'])
gl.vertexAttribPointer(ballsAttribsLocations['a_position'], 2, gl.FLOAT, false, 0, 0)

// Balls UVs
const ballsUvsBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, ballsUvsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, ballsUvsArray, gl.STATIC_DRAW)
ballsAttribsLocations['a_uv'] = gl.getAttribLocation(ballsProgram, 'a_uv')
gl.enableVertexAttribArray(ballsAttribsLocations['a_uv'])
gl.vertexAttribPointer(ballsAttribsLocations['a_uv'], 2, gl.FLOAT, false, 0, 0)

// Balls Instances Offsets
const ballsOffsetsBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, ballsOffsetsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, offsetsArray, gl.STATIC_DRAW)
ballsAttribsLocations['a_offset'] = gl.getAttribLocation(ballsProgram, 'a_offset')
gl.enableVertexAttribArray(ballsAttribsLocations['a_offset'])
gl.vertexAttribPointer(ballsAttribsLocations['a_offset'], 2, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(location, 1)
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

document.addEventListener('DOMContentLoaded', init)

function init() {
  threadChooserWrapper.addEventListener('click', onThreadChoose)
  appContainer.appendChild(canvas)

  resizeCanvas()
  document.body.addEventListener('resize', resizeCanvas)

  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  const canvasTexture = getCanvasTexture({
    size: 512,
    headline: 'HAPPY 2021'
  })

  const projectionMatrix = orthographic({
    left: 0,
    right: GLOBAL_STATE.innerWidth / 2,
    bottom: GLOBAL_STATE.innerHeight / 2,
    top: 0,
    near: 1,
    far: -1,
  })

  gl.useProgram(ballsProgram)
  const u_projectionMatrix = gl.getUniformLocation(ballsProgram, 'u_projectionMatrix')
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.useProgram(null)

  gl.useProgram(planeProgram)
  u_texture = gl.getUniformLocation(planeProgram, 'u_texture')
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

function renderFrame(ts) {
  const dt = ts - oldTime
  oldTime = ts

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  vaoExtension.bindVertexArrayOES(ballsVao)
  gl.useProgram(ballsProgram)
  instanceExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, GLOBAL_STATE.particleCount)
  gl.useProgram(null)
  vaoExtension.bindVertexArrayOES(null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)


  // gl.clearColor(0.1, 0.1, 0.1, 1.0)
  // gl.clear(gl.COLOR_BUFFER_BIT)

  vaoExtension.bindVertexArrayOES(planeVao)
  gl.useProgram(planeProgram)
  gl.bindTexture(gl.TEXTURE_2D, targetTexture)
  gl.uniform1i(u_texture, 0)

  gl.drawArrays(gl.TRIANGLES, 0, 6)

  gl.bindTexture(gl.TEXTURE_2D, null)
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
    const {
      velocitiesArray: newVelocitiesArray,
      offsetsArray: newOffsetsArray,
      oldOffsetsArray: newOldOffsetsArray,
    } = calculatePhysics({
      velocitiesArray,
      oldOffsetsArray,
      offsetsArray,
    }, {
      innerWidth: GLOBAL_STATE.innerWidth,
      innerHeight: GLOBAL_STATE.innerHeight,
      radius: GLOBAL_STATE.radius,
      particlesCount: GLOBAL_STATE.particleCount,
      bounceScale: GLOBAL_STATE.bounceScale,
      gravity: GLOBAL_STATE.gravity,
    })

    velocitiesArray = newVelocitiesArray
    offsetsArray = newOffsetsArray
    oldOffsetsArray = newOldOffsetsArray

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
