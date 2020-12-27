import 'webgl-lint.js'

import {
  makeProgram,
  getExtension,
  orthographic,
} from './helpers'

import calculatePhysics from './calculate-physics'

import vertexShaderSource from './shader.vert'
import fragmentShaderSource from './shader.frag'

import PhysicsWorker from 'web-worker:./physics-worker'

import {
  EVT_INIT_WORLD,
  EVT_REQUEST_UPDATE_WORLD,
  EVT_UPDATED_WORLD,
} from './constants'

const GLOBAL_STATE = {
  innerWidth,
  innerHeight,
  radius: 10,
  particleCount: 2000,
  bounceScale: 0.8,
  gravity: 0.9,
  useWorker: false,
}

const threadChooserWrapper = document.getElementsByClassName('thread-options')[0]
const appContainer = document.getElementById('canvas-container')
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl')
const instanceExtension = getExtension(gl, 'ANGLE_instanced_arrays')
const worker = new PhysicsWorker()
const glProgram = makeProgram(gl, {
  vertexShaderSource,
  fragmentShaderSource,
})

const ballVertexArray = new Float32Array([-GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2, -GLOBAL_STATE.radius / 2])
const uvsArray = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])

let ballOffsetsArray
let ballVelocitiesArray
let oldTime = 0

ballOffsetsArray = new Float32Array(GLOBAL_STATE.particleCount * 2)
ballVelocitiesArray = new Float32Array(GLOBAL_STATE.particleCount * 2).fill(0)

for (let i = 0; i < GLOBAL_STATE.particleCount; i++) {
  const randX = Math.random() * GLOBAL_STATE.innerWidth
  const randY = Math.random() * -GLOBAL_STATE.innerHeight
  ballOffsetsArray[i * 2 + 0] = randX
  ballOffsetsArray[i * 2 + 1] = randY

  ballVelocitiesArray[i * 2] = (Math.random() * 2 - 1) * 10
  ballVelocitiesArray[i * 2 + 1] = Math.random() * 3 + 1
}

setupWebGLAttributeWithBuffer({
  typedArray: ballVertexArray,
  attributeName: 'a_position',
  countPerVertex: 2
})

setupWebGLAttributeWithBuffer({
  typedArray: uvsArray,
  attributeName: 'a_uv',
  countPerVertex: 2
})

const offsetsBuffer = setupWebGLAttributeWithBuffer({
  typedArray: ballOffsetsArray,
  attributeName: 'a_offset',
  countPerVertex: 2,
  instancedDivisor: 1,
  drawType: gl.DYNAMIC_DRAW,
})

document.addEventListener('DOMContentLoaded', init)

function init() {
  threadChooserWrapper.addEventListener('click', onThreadChoose)

  appContainer.appendChild(canvas)
  resizeCanvas()
  document.body.addEventListener('resize', resizeCanvas)

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  gl.useProgram(glProgram)

  const projectionMatrix = orthographic({
    left: 0,
    right: GLOBAL_STATE.innerWidth / 2,
    bottom: GLOBAL_STATE.innerHeight / 2,
    top: 0,
    near: 1,
    far: -1,
  })
  const u_projectionMatrix = gl.getUniformLocation(glProgram, 'u_projectionMatrix')
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)

  worker.postMessage({
    type: EVT_INIT_WORLD,
    innerWidth: GLOBAL_STATE.innerWidth,
    innerHeight: GLOBAL_STATE.innerHeight,
    radius: GLOBAL_STATE.radius,
    particlesCount: GLOBAL_STATE.particleCount,
    bounceScale: GLOBAL_STATE.bounceScale,
    gravity: GLOBAL_STATE.gravity,
  })

  worker.onmessage = onWorkerMessage
  requestAnimationFrame(renderFrame)
}

function onWorkerMessage(e) {
  if (!GLOBAL_STATE.useWorker) {
    return
  }
  if (e.data.type === EVT_UPDATED_WORLD) {
    const {
      ballVelocitiesArray: newVelocitiesArray,
      ballOffsetsArray: newOffsetsArray,
    } = e.data

    ballVelocitiesArray = newVelocitiesArray
    ballOffsetsArray = newOffsetsArray

    gl.bindBuffer(gl.ARRAY_BUFFER, offsetsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, ballOffsetsArray, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }
}

function renderFrame(ts) {
  const dt = ts - oldTime
  oldTime = ts

  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  instanceExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, GLOBAL_STATE.particleCount)

  if (GLOBAL_STATE.useWorker) {
    if (ballVelocitiesArray.buffer.byteLength && ballOffsetsArray.buffer.byteLength) {
      worker.postMessage({
        type: EVT_REQUEST_UPDATE_WORLD,
        velocitiesArray: ballVelocitiesArray,
        offsetsArray: ballOffsetsArray,
      }, [
        ballVelocitiesArray.buffer,
        ballOffsetsArray.buffer,
      ])
    }
  } else {
    const {
      velocitiesArray: newVelocitiesArray,
      offsetsArray: newOffsetsArray,
    } = calculatePhysics({
      velocitiesArray: ballVelocitiesArray,
      offsetsArray: ballOffsetsArray,
    }, {
      innerWidth: GLOBAL_STATE.innerWidth,
      innerHeight: GLOBAL_STATE.innerHeight,
      radius: GLOBAL_STATE.radius,
      particlesCount: GLOBAL_STATE.particleCount,
      bounceScale: GLOBAL_STATE.bounceScale,
      gravity: GLOBAL_STATE.gravity,
    })

    ballVelocitiesArray = newVelocitiesArray
    ballOffsetsArray = newOffsetsArray

    gl.bindBuffer(gl.ARRAY_BUFFER, offsetsBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, ballOffsetsArray, gl.DYNAMIC_DRAW)
    gl.bindBuffer(gl.ARRAY_BUFFER, null)
  }

  requestAnimationFrame(renderFrame)
}

// Helpers ----------------------------------------------------------

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

function setupWebGLAttributeWithBuffer({
  typedArray,
  attributeName,
  countPerVertex,
  instancedDivisor = null,
  type = gl.FLOAT,
  normalized = false,
  stride = 0,
  offset = 0,
  drawType = gl.STATIC_DRAW,
}) {
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, typedArray, drawType)
  const location = gl.getAttribLocation(glProgram, attributeName)
  gl.enableVertexAttribArray(location)
  gl.vertexAttribPointer(location, countPerVertex, type, normalized, stride, offset)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  if (instancedDivisor) {
    instanceExtension.vertexAttribDivisorANGLE(location, instancedDivisor)
  }
  return buffer
}

function resizeCanvas() {
  const dpr = devicePixelRatio || 1
  canvas.width = GLOBAL_STATE.innerWidth * dpr
  canvas.height = GLOBAL_STATE.innerHeight * dpr
  canvas.style.width = `${GLOBAL_STATE.innerWidth}px`
  canvas.style.height = `${GLOBAL_STATE.innerHeight}px`
}
