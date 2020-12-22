import 'webgl-lint.js'
import { mat4 } from 'gl-matrix'

import {
  makeProgram,
  getExtension,
} from './helpers'

const PARTICLE_COUNT = 50

const appContainer = document.getElementById('app-container')
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl')

const instanceExtension = getExtension(gl, 'ANGLE_instanced_arrays')

console.log(instanceExtension)

document.addEventListener('DOMContentLoaded', init)

const glProgram = makeProgram(gl, {
  vertexShaderSource: `
    precision highp float;

    uniform mat4 u_projectionMatrix;

    attribute vec4 a_offset;
    attribute vec4 a_position;

    void main () {
      gl_Position = u_projectionMatrix * (a_offset + a_position);
    }
  `,
  fragmentShaderSource: `
    precision highp float;

    void main () {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `
})

const radius = 50
const vertexArray = new Float32Array([
  -radius, radius,
  radius, radius,
  radius, -radius,
  -radius, radius,
  radius, -radius,
  -radius, -radius
])
const vertexBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, vertexArray, gl.STATIC_DRAW)

const a_position = gl.getAttribLocation(glProgram, 'a_position')
gl.enableVertexAttribArray(a_position)
gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0)

const offsetsPositions = new Float32Array(PARTICLE_COUNT * 2)
for (let i = 0; i < PARTICLE_COUNT; i++) {
  const randX = Math.random() * innerWidth
  const randY = Math.random() * innerHeight
  offsetsPositions[i * 2] = randX
  offsetsPositions[i * 2 + 1] = randY
}
const offsetsBuffer = gl.createBuffer()
gl.bindBuffer(gl.ARRAY_BUFFER, offsetsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, offsetsPositions, gl.DYNAMIC_DRAW)

const a_offset = gl.getAttribLocation(glProgram, 'a_offset')
gl.enableVertexAttribArray(a_offset)
gl.vertexAttribPointer(a_offset, 2, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(a_offset, 1)

const aspect = innerWidth / innerHeight
const projectionMatrix = mat4.create()
mat4.ortho(projectionMatrix, 0, innerWidth, innerHeight, 0, 400, -400)
console.log(projectionMatrix)

gl.useProgram(glProgram)
const u_projectionMatrix = gl.getUniformLocation(glProgram, 'u_projectionMatrix')
gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
gl.useProgram(null)

function init() {
  appContainer.appendChild(canvas)
  resizeCanvas()
  document.body.addEventListener('resize', resizeCanvas)

  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  gl.viewport(0, 0, innerWidth, innerHeight)

  gl.useProgram(glProgram)
  // gl.drawArrays(gl.TRIANGLES, 0, 6)

  instanceExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, PARTICLE_COUNT)
}

function resizeCanvas() {
  const dpr = devicePixelRatio || 1
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  canvas.style.width = `${innerWidth}px`
  canvas.style.height = `${innerHeight}px`
}
