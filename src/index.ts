import 'oes-vertex-attrib-array-polyfill'

import {
  makeProgram,
  getExtension,
  orthographic,
} from './helpers'

import getCanvasTexture from './get-canvas-texture'

import ballsVertexShaderSource from './balls-shader.vert'
import ballsFragmentShaderSource from './balls-shader.frag'
import quadVertexShaderSource from './quad-shader.vert'
import quadFragmentShaderSource from './quad-shader.frag'
import linesVertexShaderSource from './lines-shader.vert'
import linesFragmentShaderSource from './lines-shader.frag'

const GLOBAL_STATE = {
  innerWidth,
  innerHeight,
  radius: 200,
  particleCount: 100,
  linesCount: 3,
  lineWidth: 300,
  bounceScale: 0.8,
  gravity: 0.005
}

const appContainer = document.getElementById('canvas-container')
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl')

// ------- WebGL Extensions -------
const webglDebugExtension = getExtension(gl, 'GMAN_debug_helper')
const instanceExtension = getExtension(gl, 'ANGLE_instanced_arrays')
const vaoExtension = getExtension(gl, 'OES_vertex_array_object')

let u_targetTexture
let u_textTexture
let oldTime = 0

// ------- Fullscreen quad program and geometry -------
const planeProgram = makeProgram(gl, {
  vertexShaderSource: quadVertexShaderSource,
  fragmentShaderSource: quadFragmentShaderSource,
})
// webglDebugExtension.tagObject(planeProgram, 'planeProgram')

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
// webglDebugExtension.tagObject(planeVao, 'planeVao')
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
const linesVertexArray = new Float32Array([0, 0, GLOBAL_STATE.lineWidth, 0])
const linesOffsetsArray = new Float32Array(GLOBAL_STATE.linesCount * 2)
const linesRotationsArray = new Float32Array(GLOBAL_STATE.linesCount)
for (let i = 0; i < GLOBAL_STATE.linesCount; i++) {

  const maxLineOccupyHeight = innerHeight * 0.75

  const lineStepY = maxLineOccupyHeight / GLOBAL_STATE.linesCount

  let angle
  if (i === 0) {
    linesOffsetsArray[i * 2 + 0] = innerWidth / 2 - innerWidth / 5 - GLOBAL_STATE.lineWidth / 2
    linesOffsetsArray[i * 2 + 1] = lineStepY
    angle = 15
  } else if (i === 1) {
    linesOffsetsArray[i * 2 + 0] = innerWidth / 2 + innerWidth / 5 - GLOBAL_STATE.lineWidth / 2
    linesOffsetsArray[i * 2 + 1] = lineStepY * 2
    angle = -15
  } else if (i === 2) {
    linesOffsetsArray[i * 2 + 0] = innerWidth / 2 - innerWidth / 8 - GLOBAL_STATE.lineWidth / 2
    linesOffsetsArray[i * 2 + 1] = lineStepY * 3
    angle = 15
  }

  linesRotationsArray[i] = angle * Math.PI / 180
}

// Look up lines program attributes
const linePositionLocation = gl.getAttribLocation(linesProgram, 'a_position')
const lineOffsetLocation = gl.getAttribLocation(linesProgram, 'a_offset')
const lineRotationLocation = gl.getAttribLocation(linesProgram, 'a_rotation')

// Create lines buffers
const linesVertexBuffer = gl.createBuffer()
// webglDebugExtension.tagObject(linesVertexBuffer, 'linesVertexBuffer')
const linesOffsetsBuffer = gl.createBuffer()
// webglDebugExtension.tagObject(linesOffsetsBuffer, 'linesOffsetsBuffer')
const linesRotationBuffers = gl.createBuffer()
// webglDebugExtension.tagObject(linesRotationBuffers, 'linesRotationBuffers')

// Create lines VAO and bind it
const linesVao = vaoExtension.createVertexArrayOES()
// webglDebugExtension.tagObject(planeVao, 'planeVao')
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
let velocitiesArray = new Float32Array(GLOBAL_STATE.particleCount * 2).fill(0)

for (let i = 0; i < GLOBAL_STATE.particleCount; i++) {
  const randX = Math.random() * GLOBAL_STATE.innerWidth
  const randY = Math.random() * -GLOBAL_STATE.innerHeight
  offsetsArray[i * 2 + 0] = randX
  offsetsArray[i * 2 + 1] = randY

  velocitiesArray[i * 2] = (Math.random() * 2 - 1) * 0.25
  velocitiesArray[i * 2 + 1] = Math.random()
}

// Create balls buffers
const ballsVertexBuffer = gl.createBuffer()
// webglDebugExtension.tagObject(ballsVertexBuffer, 'ballsVertexBuffer')
const ballsUvsBuffer = gl.createBuffer()
// webglDebugExtension.tagObject(ballsUvsBuffer, 'ballsUvsBuffer')
const ballsOffsetsBuffer = gl.createBuffer()
// webglDebugExtension.tagObject(ballsOffsetsBuffer, 'ballsOffsetsBuffer')

// Create balls VAO
const ballsVao = vaoExtension.createVertexArrayOES()
// webglDebugExtension.tagObject(ballsVao, 'ballsVao')
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
  // Append canvas to DOM
  appContainer.appendChild(canvas)
  // Resize canvas and listen to resize events
  resizeCanvas()
  document.body.addEventListener('resize', resizeCanvas)

  // Enable blending
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

  // Create orthographic projection matrix
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
  // Pass projection matrix to balls program
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.useProgram(null)

  gl.useProgram(linesProgram)
  u_projectionMatrix = gl.getUniformLocation(linesProgram, 'u_projectionMatrix')
  // Pass projection matrix to lines program
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.useProgram(null)

  gl.useProgram(planeProgram)
  // Look up textures locations for fullscreen postprocessing quad
  u_targetTexture = gl.getUniformLocation(planeProgram, 'u_targetTexture')
  u_textTexture = gl.getUniformLocation(planeProgram, 'u_textTexture')
  // Pass screen resolution to postprocessing quad
  const u_resolution = gl.getUniformLocation(planeProgram, 'u_resolution')
  gl.uniform2f(u_resolution, canvas.width, canvas.height)
  const u_textTextureResolution = gl.getUniformLocation(planeProgram, 'u_textTextureResolution')
  gl.uniform2f(u_textTextureResolution, textureCanvas.width, textureCanvas.height)
  gl.useProgram(null)

  requestAnimationFrame(renderFrame)
}

function renderFrame(ts) {
  let dt = ts - oldTime
  if (dt > 1) {
    dt = 1
  }
  oldTime = ts

  // ------- Update phsycis -------
  // Check balls collisions
  for (let i = 0; i < GLOBAL_STATE.particleCount; i++) {
    for (let n = i + 1; n < GLOBAL_STATE.particleCount; n++) {
      // checkCollision(i, n)
    }
  }
  for (let i = 0; i < GLOBAL_STATE.particleCount; i++) {
    // Update balls with correct velocities
    moveBall(dt, i)
    // Bounce balls back when touching viewport borders
    checkWall(i)
  }
  for (let i = 0; i < GLOBAL_STATE.linesCount; i++) {
    // Bounce balls of lines
    checkLine(i)
  }
  // Update balls offsets
  gl.bindBuffer(gl.ARRAY_BUFFER, ballsOffsetsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, offsetsArray, gl.DYNAMIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  // ------- Render our scene -------
  // Size and clear canvas
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  // Bind framebuffer to render the balls to
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)

  // Clear framebuffer before drawing
  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  vaoExtension.bindVertexArrayOES(ballsVao)
  gl.useProgram(ballsProgram)
  instanceExtension.drawArraysInstancedANGLE(gl.TRIANGLES, 0, 6, GLOBAL_STATE.particleCount)
  gl.useProgram(null)
  vaoExtension.bindVertexArrayOES(null)

  // Unbind framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)

  // Render post processing quad
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

  // Render lines
  vaoExtension.bindVertexArrayOES(linesVao)
  gl.useProgram(linesProgram)
  instanceExtension.drawArraysInstancedANGLE(gl.LINES, 0, 2, GLOBAL_STATE.linesCount)
  gl.useProgram(null)
  vaoExtension.bindVertexArrayOES(null)

  // Issue next draw
  requestAnimationFrame(renderFrame)
}

// ------- Helpers -------
function getLineBounds(i) {
  const x1 = linesVertexArray[0]
  const y1 = linesVertexArray[1]
  const x2 = linesVertexArray[2]
  const y2 = linesVertexArray[3]
  if (linesRotationsArray[i] === 0) {
    const minX = Math.min(x1, x2)
    const minY = Math.min(y1, y2)
    const maxX = Math.max(x1, x2)
    const maxY = Math.max(y1, y2)
    return {
      x: x1 + minX,
      y: y1 + minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  } else {
    const rotation = linesRotationsArray[i]
    const sin = Math.sin(rotation)
    const cos = Math.cos(rotation)
    const x1r = cos * x1 + sin * y1
    const x2r = cos * x2 + sin * y2
    const y1r = cos * y1 + sin * x1
    const y2r = cos * y2 + sin * x2
    const x = linesOffsetsArray[i * 2 + 0] + x1 + Math.min(x1r, x2r)
    const y = linesOffsetsArray[i * 2 + 1] + y1 + Math.min(y1r, y2r)
    const width = Math.max(x1r, x2r) - Math.min(x1r, x2r)
    const height = Math.max(y1r, y2r) - Math.min(y1r, y2r)
    return {
      x,
      y,
      width,
      height,
    }
  }
}

function moveBall(dt, i) {
  velocitiesArray[i * 2 + 1] += GLOBAL_STATE.gravity
  offsetsArray[i * 2 + 0] += velocitiesArray[i * 2 + 0] * (dt)
  offsetsArray[i * 2 + 1] += velocitiesArray[i * 2 + 1] * (dt)
}

function checkWall(i) {
  if (offsetsArray[i * 2 + 0] < GLOBAL_STATE.particleCount / 2) {
    offsetsArray[i * 2] = GLOBAL_STATE.particleCount / 2
    velocitiesArray[i * 2] *= -GLOBAL_STATE.bounceScale
  }
  if (offsetsArray[i * 2] + GLOBAL_STATE.radius / 2 > innerWidth) {
    offsetsArray[i * 2] = innerWidth - GLOBAL_STATE.radius / 2
    velocitiesArray[i * 2] *= -GLOBAL_STATE.bounceScale
  }
  if (offsetsArray[i * 2 + 1] - GLOBAL_STATE.particleCount / 2 > innerHeight) {
    offsetsArray[i * 2 + 1] = -GLOBAL_STATE.particleCount
    velocitiesArray[i * 2 + 1] = 0
  }
}

function checkLine(lineIdx) {
  const lineBounds = getLineBounds(lineIdx)
  const ballRadius = GLOBAL_STATE.particleCount / 1.5

  for (let i = 0; i < GLOBAL_STATE.particleCount; i++) {
    const ballx = offsetsArray[i * 2 + 0]
    const bally = offsetsArray[i * 2 + 1]
    const ballvx = velocitiesArray[i * 2 + 0]
    const ballvy = velocitiesArray[i * 2 + 1]

    if (ballx + ballRadius / 2 > lineBounds.x && ballx - ballRadius / 2 < lineBounds.x + lineBounds.width) {
      const lineRotation = linesRotationsArray[lineIdx]
      const cos = Math.cos(lineRotation)
      const sin = Math.sin(lineRotation)

      let x = ballx - linesOffsetsArray[lineIdx * 2 + 0]
      let y = bally - linesOffsetsArray[lineIdx * 2 + 1]
      let vx1 = cos * ballvx + sin * ballvy
      let vy1 = cos * ballvy - sin * ballvx

      let y1 = cos * y - sin * x

      if (y1 > -ballRadius / 2 && y1 < vy1) {
        const x2 = cos * x + sin * y

        y1 = -ballRadius / 2
        vy1 *= -0.35

        x = cos * x2 - sin * y1
        y = cos * y1 + sin * x2

        velocitiesArray[i * 2 + 0] = cos * vx1 - sin * vy1
        velocitiesArray[i * 2 + 1] = cos * vy1 + sin * vx1

        offsetsArray[i * 2 + 0] = linesOffsetsArray[lineIdx * 2 + 0] + x
        offsetsArray[i * 2 + 1] = linesOffsetsArray[lineIdx * 2 + 1] + y
      }
    }
  }
}

function rotate(x, y, sin, cos, reverse) {
  return {
    x: reverse ? x * cos + y * sin : x * cos - y * sin,
    y: reverse ? y * cos - x * sin : y * cos + x * sin
  }
}

function checkCollision(i0, i1) {
  const ballMass = 1
  const ball0x = offsetsArray[i0 * 2 + 0]
  const ball0y = offsetsArray[i0 * 2 + 1]
  const ball1x = offsetsArray[i1 * 2 + 0]
  const ball1y = offsetsArray[i1 * 2 + 1]

  let ball0vx = velocitiesArray[i0 * 2 + 0]
  let ball0vy = velocitiesArray[i0 * 2 + 1]
  let ball1vx = velocitiesArray[i1 * 2 + 0]
  let ball1vy = velocitiesArray[i1 * 2 + 1]

  const dx = ball1x - ball0x
  const dy = ball1y - ball0y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = GLOBAL_STATE.radius + GLOBAL_STATE.radius
  if (dist < minDist) {
    //calculate angle, sine, and cosine
    const angle = Math.atan2(dy, dx)
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)

    //rotate ball0's position
    const pos0 = { x: 0, y: 0 }

    //rotate ball1's position
    const pos1 = rotate(dx, dy, sin, cos, true)

    //rotate ball0's velocity
    const vel0 = rotate(ball0vx, ball0vy, sin, cos, true)

    //rotate ball1's velocity
    const vel1 = rotate(ball1vx, ball1vy, sin, cos, true)

    //collision reaction
    const vxTotal = (vel0.x - vel1.x)
    vel0.x = ((ballMass - ballMass) * vel0.x + 2 * ballMass * vel1.x) / (ballMass + ballMass)
    vel1.x = vxTotal + vel0.x

    const absV = Math.abs(vel0.x) + Math.abs(vel1.x)
    const overlap = (GLOBAL_STATE.radius + GLOBAL_STATE.radius) - Math.abs(pos0.x - pos1.x)
    pos0.x += vel0.x / absV * overlap
    pos1.x += vel1.x / absV * overlap

    //rotate positions back
    const pos0F = rotate(pos0.x, pos0.y, sin, cos, false)
    const pos1F = rotate(pos1.x, pos1.y, sin, cos, false)

    //adjust positions to actual screen positions
    offsetsArray[i1 * 2 + 0] = offsetsArray[i0 * 2 + 0] + pos1F.x
    offsetsArray[i1 * 2 + 1] = offsetsArray[i0 * 2 + 1] + pos1F.y
    offsetsArray[i0 * 2 + 0] = offsetsArray[i0 * 2 + 0] + pos0F.x
    offsetsArray[i0 * 2 + 1] = offsetsArray[i0 * 2 + 1] + pos0F.y

    //rotate velocities back
    const vel0F = rotate(vel0.x, vel0.y, sin, cos, false)
    const vel1F = rotate(vel1.x, vel1.y, sin, cos, false)

    velocitiesArray[i0 * 2 + 0] = vel0F.x
    velocitiesArray[i0 * 2 + 1] = vel0F.y
    velocitiesArray[i1 * 2 + 0] = vel1F.x
    velocitiesArray[i1 * 2 + 1] = vel1F.y
  }
}

function resizeCanvas() {
  const dpr = 1
  canvas.width = GLOBAL_STATE.innerWidth * dpr
  canvas.height = GLOBAL_STATE.innerHeight * dpr
  canvas.style.width = `${GLOBAL_STATE.innerWidth}px`
  canvas.style.height = `${GLOBAL_STATE.innerHeight}px`
}
