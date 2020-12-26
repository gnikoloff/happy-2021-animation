import 'webgl-lint.js'

import {
  makeProgram,
  getExtension,
  orthographic,
} from './helpers'

import PhysicsWorker from 'web-worker:./physics-worker'

const worker = new PhysicsWorker()


const PARTICLE_COUNT = 5000
const BOUNCE_SCALE = 0.8
const GRAVITY = 2

const appContainer = document.getElementById('app-container')
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl')

const instanceExtension = getExtension(gl, 'ANGLE_instanced_arrays')

let oldTime = 0

document.addEventListener('DOMContentLoaded', init)

const glProgram = makeProgram(gl, {
  vertexShaderSource: `
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
  `,
  fragmentShaderSource: `
    precision highp float;

    varying vec2 v_uv;

    void main () {
      float dist = distance(v_uv, vec2(0.5));
      float c = 1.0 - smoothstep(0.475, 0.525, dist);
      gl_FragColor = vec4(v_uv, 0.0, c);
    }
  `
})

const radius = 50

const vertexArray = new Float32Array([-radius / 2, radius / 2, radius / 2, radius / 2, radius / 2, -radius / 2, -radius / 2, radius / 2, radius / 2, -radius / 2, -radius / 2, -radius / 2])
const uvsArray = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])

let offsetsArray = new Float32Array(PARTICLE_COUNT * 2)
let velocitiesArray = new Float32Array(PARTICLE_COUNT * 2)

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const randX = Math.random() * innerWidth
  const randY = Math.random() * innerHeight
  offsetsArray[i * 2] = randX
  offsetsArray[i * 2 + 1] = randY

  velocitiesArray[i * 2] = (Math.random() * 2 - 1) * 10
  velocitiesArray[i * 2 + 1] = Math.random() * 3 + 1
}

const vertexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW)
const a_position = gl.getAttribLocation(glProgram, 'a_position')
gl.enableVertexAttribArray(a_position)
gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0)

const uvBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer)
gl.bufferData(gl.ARRAY_BUFFER, uvsArray, gl.STATIC_DRAW)
const a_uv = gl.getAttribLocation(glProgram, 'a_uv')
gl.enableVertexAttribArray(a_uv)
gl.vertexAttribPointer(a_uv, 2, gl.FLOAT, false, 0, 0)

const offsetsBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, offsetsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, offsetsArray, gl.DYNAMIC_DRAW)

const a_offset = gl.getAttribLocation(glProgram, 'a_offset')
gl.enableVertexAttribArray(a_offset)
gl.vertexAttribPointer(a_offset, 2, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(a_offset, 1)

const projectionMatrix = orthographic({
  left: 0,
  right: innerWidth / 2,
  bottom: innerHeight / 2,
  top: 0,
  near: 1,
  far: -1,
})
gl.useProgram(glProgram)
const u_projectionMatrix = gl.getUniformLocation(glProgram, 'u_projectionMatrix')
gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
gl.useProgram(null)

function init() {
  appContainer.appendChild(canvas)
  resizeCanvas()
  document.body.addEventListener('resize', resizeCanvas)

  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

  gl.useProgram(glProgram)

  // gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
  // gl.enable(gl.BLEND)
  // gl.disable(gl.DEPTH_TEST)

  worker.postMessage({
    type: 'init',
    innerWidth,
    innerHeight,
    radius,
    particleCount: PARTICLE_COUNT,
    gravity: GRAVITY,
    bounceScale: BOUNCE_SCALE,
  })

  requestAnimationFrame(renderFrame)
}


worker.onmessage = e => {
  const { velocitiesArray: newVelocitiesArray, offsetsArray: newOffsetsArray } = e.data

  velocitiesArray = newVelocitiesArray
  offsetsArray = newOffsetsArray

  gl.bindBuffer(gl.ARRAY_BUFFER, offsetsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, offsetsArray, gl.DYNAMIC_DRAW)
}



function renderFrame(ts) {
  const dt = ts - oldTime
  oldTime = ts

  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  instanceExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, PARTICLE_COUNT)


  if (velocitiesArray.buffer.byteLength && offsetsArray.buffer.byteLength) {
    worker.postMessage({
      type: 'update-world',
      velocitiesArray,
      offsetsArray,
    }, [velocitiesArray.buffer, offsetsArray.buffer])
  }

  requestAnimationFrame(renderFrame)
}

function resizeCanvas() {
  const dpr = devicePixelRatio || 1
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  canvas.style.width = `${innerWidth}px`
  canvas.style.height = `${innerHeight}px`
}
