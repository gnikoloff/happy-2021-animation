import 'oes-vertex-attrib-array-polyfill'
import * as dat from 'dat.gui'

import ballsVertexShaderSource from './balls-shader.vert'
import ballsFragmentShaderSource from './balls-shader.frag'

import quadVertexShaderSource from './quad-shader.vert'
import quadFragmentShaderSource from './quad-shader.frag'

import linesVertexShaderSource from './lines-shader.vert'
import linesFragmentShaderSource from './lines-shader.frag'

import labelVertexShaderSource from './label-shader.vert'
import labelFragmentShaderSource from './label-shader.frag'

const isPortrait = innerWidth < innerHeight
const isMobile = isMobileBrowser() && !isIPad()

const GLOBAL_STATE = {
  innerWidth,
  innerHeight,
  radius: isMobile && isPortrait ? 120 : 200,
  particleCount: isMobile && isPortrait ? 150 : 100,
  linesCount: 3,
  lineWidth: isMobile && isPortrait ? 110 : 300,
  lineAngle: 20,
  linesSpring: 0.7,
  bounceScale: 0.8,
  lineBounceScale: 0.35,
  gravity: 0.05,
  labelFontFamily: 'sans-serif',
  animationSwitchTimeout: 6000,
  debugMode: false,
  disablePostProcessing: false,
}

const maxLineOccupyHeight = GLOBAL_STATE.innerHeight * 0.75
const lineStepY = maxLineOccupyHeight / GLOBAL_STATE.linesCount

const linesData = [
  {
    x: innerWidth / 2 - innerWidth / 5,
    y: lineStepY,
    targetX: innerWidth / 2 - innerWidth / 5,
    angle: GLOBAL_STATE.lineAngle * Math.PI / 180,
    angleTarget: GLOBAL_STATE.lineAngle * Math.PI / 180,
    angleVel: 0,
    vx: 0,
    rotVx: 0,
  },
  {
    x: innerWidth / 2 + innerWidth / 5,
    y: lineStepY * 2,
    targetX: innerWidth / 2 + innerWidth / 5,
    angle: -GLOBAL_STATE.lineAngle * Math.PI / 180,
    angleTarget: -GLOBAL_STATE.lineAngle * Math.PI / 180,
    angleVel: 0,
    vx: 0,
    rotVx: 0,
  },
  {
    x: innerWidth / 2 - innerWidth / 5,
    y: lineStepY * 3,
    targetX: innerWidth / 2 - innerWidth / 5,
    angle: GLOBAL_STATE.lineAngle * Math.PI / 180,
    angleTarget: GLOBAL_STATE.lineAngle * Math.PI / 180,
    angleVel: 0,
    vx: 0,
    rotVx: 0,
  }
]

const gui = new dat.GUI({ width: 310 })
gui.close()

const appContainer = document.getElementById('canvas-container')
const canvas = document.createElement('canvas')
const gl = canvas.getContext('webgl')

let oldTime = 0
let animationSwitchCounter = 0

let u_targetTexture
let u_labelTexturesArray
let u_labelDebugMode
let u_ballDebugMode

// ------- WebGL Extensions -------
const webglDebugExtension = gl.getExtension('GMAN_debug_helper')
const instanceExtension = gl.getExtension('ANGLE_instanced_arrays')
const vaoExtension = gl.getExtension('OES_vertex_array_object')

// ------- Quad labels textures -------
const labelWidth = GLOBAL_STATE.lineWidth
const labelHeight = GLOBAL_STATE.lineWidth / 2
const label0Texture = createLabelTexture('HAPPY')
const label1Texture = createLabelTexture('NEW')
const label2Texture = createLabelTexture('YEAR')

// ------- Fullscreen quad program and geometry -------
const planeProgram = makeProgram(gl, {
  vertexShaderSource: quadVertexShaderSource,
  fragmentShaderSource: quadFragmentShaderSource,
})
tagDebugGLObject(planeProgram, 'planeProgram')

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
tagDebugGLObject(planeVao, 'planeVao')
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

// ------- Hardware instanced text labels program and geometry -------
const labelProgram = makeProgram(gl, {
  vertexShaderSource: labelVertexShaderSource,
  fragmentShaderSource: labelFragmentShaderSource,
})

const labelVertexArray = new Float32Array([-labelWidth / 2, 0, labelWidth / 2, 0, labelWidth / 2, -labelHeight, -labelWidth / 2, 0, labelWidth / 2, -labelHeight, -labelWidth / 2, -labelHeight])
const labelUvsArray = new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1])
const labelTransformsArray = new Float32Array(GLOBAL_STATE.linesCount * 3)
const labelTexturesIndicesArray = new Float32Array(GLOBAL_STATE.linesCount)

for (let i = 0; i < GLOBAL_STATE.linesCount; i++) {
  labelTransformsArray[i * 3 + 0] = linesData[i].x
  labelTransformsArray[i * 3 + 1] = linesData[i].y
  labelTransformsArray[i * 3 + 2] = linesData[i].angle

  labelTexturesIndicesArray[i] = i
}

// Look up label quad attribute locations
const labelPositionLocation = gl.getAttribLocation(labelProgram, 'a_position')
const labelUvLocation = gl.getAttribLocation(labelProgram, 'a_uv')
const labelTransformLocation = gl.getAttribLocation(labelProgram, 'a_transform')
const labelTextureIndexLocation = gl.getAttribLocation(labelProgram, 'a_textureIdx')

// Create label quad buffers
const labelVertexBuffer = gl.createBuffer()
tagDebugGLObject(labelVertexBuffer, 'labelVertexBuffer')
const labelUvsBuffer = gl.createBuffer()
tagDebugGLObject(labelVertexBuffer, 'labelUvsBuffer')
const labelTransformsBuffer = gl.createBuffer()
tagDebugGLObject(labelTransformsBuffer, 'labelTransformsBuffer')
const labelTextureIndicesBuffer = gl.createBuffer()
tagDebugGLObject(labelTextureIndicesBuffer, 'labelTextureIndicesBuffer')

// Create and bind label VAO
const labelVAO = vaoExtension.createVertexArrayOES()
tagDebugGLObject(labelVAO, 'labelVAO')
vaoExtension.bindVertexArrayOES(labelVAO)

// Label vertices
gl.bindBuffer(gl.ARRAY_BUFFER, labelVertexBuffer)
gl.bufferData(gl.ARRAY_BUFFER, labelVertexArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(labelPositionLocation)
gl.vertexAttribPointer(labelPositionLocation, 2, gl.FLOAT, false, 0, 0)

// Label uvs
gl.bindBuffer(gl.ARRAY_BUFFER, labelUvsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, labelUvsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(labelUvLocation)
gl.vertexAttribPointer(labelUvLocation, 2, gl.FLOAT, false, 0, 0)

// Label offsets and rotations
gl.bindBuffer(gl.ARRAY_BUFFER, labelTransformsBuffer)
gl.bufferData(gl.ARRAY_BUFFER, labelTransformsArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(labelTransformLocation)
gl.vertexAttribPointer(labelTransformLocation, 3, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(labelTransformLocation, 1)

// Label texture indices
gl.bindBuffer(gl.ARRAY_BUFFER, labelTextureIndicesBuffer)
gl.bufferData(gl.ARRAY_BUFFER, labelTexturesIndicesArray, gl.STATIC_DRAW)
gl.enableVertexAttribArray(labelTextureIndexLocation)
gl.vertexAttribPointer(labelTextureIndexLocation, 1, gl.FLOAT, false, 0, 0)
instanceExtension.vertexAttribDivisorANGLE(labelTextureIndexLocation, 1)

// Unbind label VAO
vaoExtension.bindVertexArrayOES(null)

// ------- Hardware instanced lines program and geometry -------
const linesProgram = makeProgram(gl, {
  vertexShaderSource: linesVertexShaderSource,
  fragmentShaderSource: linesFragmentShaderSource,
})
const linesVertexArray = new Float32Array([-GLOBAL_STATE.lineWidth / 2, 0, GLOBAL_STATE.lineWidth / 2, 0])
const linesOffsetsArray = new Float32Array([linesData[0].x, linesData[0].y, linesData[1].x, linesData[1].y, linesData[2].x, linesData[2].y])
const linesRotationsArray = new Float32Array([linesData[0].angle, linesData[1].angle, linesData[2].angle])

// Look up lines program attributes
const linePositionLocation = gl.getAttribLocation(linesProgram, 'a_position')
const lineOffsetLocation = gl.getAttribLocation(linesProgram, 'a_offset')
const lineRotationLocation = gl.getAttribLocation(linesProgram, 'a_rotation')

// Create lines buffers
const linesVertexBuffer = gl.createBuffer()
tagDebugGLObject(linesVertexBuffer, 'linesVertexBuffer')
const linesOffsetsBuffer = gl.createBuffer()
tagDebugGLObject(linesOffsetsBuffer, 'linesOffsetsBuffer')
const linesRotationBuffers = gl.createBuffer()
tagDebugGLObject(linesRotationBuffers, 'linesRotationBuffers')

// Create lines VAO and bind it
const linesVao = vaoExtension.createVertexArrayOES()
tagDebugGLObject(planeVao, 'planeVao')
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
tagDebugGLObject(ballsVertexBuffer, 'ballsVertexBuffer')
const ballsUvsBuffer = gl.createBuffer()
tagDebugGLObject(ballsUvsBuffer, 'ballsUvsBuffer')
const ballsOffsetsBuffer = gl.createBuffer()
tagDebugGLObject(ballsOffsetsBuffer, 'ballsOffsetsBuffer')

// Create balls VAO
const ballsVao = vaoExtension.createVertexArrayOES()
tagDebugGLObject(ballsVao, 'ballsVao')
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
instanceExtension.vertexAttribDivisorANGLE(ballsOffsetLocation, 1)

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

document.addEventListener('DOMContentLoaded', init)

function init() {
  // Initialize dat.GUI
  gui.add(GLOBAL_STATE, 'debugMode').onChange(newVal => {
    gl.useProgram(labelProgram)
    gl.uniform1f(u_labelDebugMode, newVal ? 1 : 0)
    gl.useProgram(null)

    gl.useProgram(ballsProgram)
    gl.uniform1f(u_ballDebugMode, GLOBAL_STATE.debugMode ? 1 : 0)
    gl.useProgram(null)

    GLOBAL_STATE.disablePostProcessing = newVal
  })
  gui.add(GLOBAL_STATE, 'disablePostProcessing').listen().onChange(newVal => {
    GLOBAL_STATE.disablePostProcessing = newVal
  })
  gui.add(GLOBAL_STATE, 'gravity').min(0.05).max(1).step(0.05)
  gui.add(GLOBAL_STATE, 'lineAngle').min(15).max(35).step(1).onChange(newVal => {
    linesData[0].angleTarget = newVal * Math.PI / 180
    linesData[1].angleTarget = -newVal * Math.PI / 180
    linesData[2].angleTarget = newVal * Math.PI / 180
    GLOBAL_STATE.lineAngle = newVal
  })
  gui.add(GLOBAL_STATE, 'lineBounceScale').min(0.1).max(0.4).step(0.05)

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

  // ------- Initialize balls uniforms -------
  gl.useProgram(ballsProgram)
  u_projectionMatrix = gl.getUniformLocation(ballsProgram, 'u_projectionMatrix')
  u_ballDebugMode = gl.getUniformLocation(ballsProgram, 'u_debugMode')
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.uniform1f(u_ballDebugMode, GLOBAL_STATE.debugMode ? 1 : 0)
  gl.useProgram(null)

  // ------- Initialize lines uniforms -------
  gl.useProgram(linesProgram)
  u_projectionMatrix = gl.getUniformLocation(linesProgram, 'u_projectionMatrix')
  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.useProgram(null)

  // ------- Initialize fullscreen quad uniforms -------
  gl.useProgram(planeProgram)
  // Look up textures locations for fullscreen postprocessing quad
  u_targetTexture = gl.getUniformLocation(planeProgram, 'u_targetTexture')
  gl.useProgram(null)

  // ------- Initialize label uniforms -------
  gl.useProgram(labelProgram)
  u_labelTexturesArray = gl.getUniformLocation(labelProgram, 'u_texturesArray')
  u_projectionMatrix = gl.getUniformLocation(labelProgram, 'u_projectionMatrix')
  u_labelDebugMode = gl.getUniformLocation(labelProgram, 'u_debugMode')

  gl.uniformMatrix4fv(u_projectionMatrix, false, projectionMatrix)
  gl.uniform1f(u_labelDebugMode, GLOBAL_STATE.debugMode ? 1 : 0)
  gl.useProgram(null)

  setInterval(() => {
    if (animationSwitchCounter % 2 === 0) {
      linesData[0].targetX = innerWidth / 2 + innerWidth / 5
      linesData[1].targetX = innerWidth / 2 - innerWidth / 5
      linesData[2].targetX = innerWidth / 2 + innerWidth / 5
      linesData[0].angleTarget = -GLOBAL_STATE.lineAngle * Math.PI / 180
      linesData[1].angleTarget = GLOBAL_STATE.lineAngle * Math.PI / 180
      linesData[2].angleTarget = -GLOBAL_STATE.lineAngle * Math.PI / 180
    } else {
      linesData[0].targetX = innerWidth / 2 - innerWidth / 5
      linesData[1].targetX = innerWidth / 2 + innerWidth / 5
      linesData[2].targetX = innerWidth / 2 - innerWidth / 5
      linesData[0].angleTarget = GLOBAL_STATE.lineAngle * Math.PI / 180
      linesData[1].angleTarget = -GLOBAL_STATE.lineAngle * Math.PI / 180
      linesData[2].angleTarget = GLOBAL_STATE.lineAngle * Math.PI / 180
    }
    animationSwitchCounter++
  }, GLOBAL_STATE.animationSwitchTimeout)

  requestAnimationFrame(renderFrame)
}

function renderFrame(ts) {
  let dt = ts - oldTime
  if (dt > 1) {
    dt = 1
  }
  oldTime = ts

  // ------- Update balls phsycis -------
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

  // Animate lines & labels positions & rotations
  for (let i = 0; i < GLOBAL_STATE.linesCount; i++) {
    linesData[i].vx += (linesData[i].targetX - linesOffsetsArray[i * 2 + 0]) * (dt * 0.1)
    linesData[i].vx *= GLOBAL_STATE.linesSpring

    linesData[i].x += linesData[i].vx

    linesOffsetsArray[i * 2 + 0] = linesData[i].x
    labelTransformsArray[i * 3 + 0] = linesData[i].x

    linesData[i].angleVel += (linesData[i].angleTarget - linesRotationsArray[i]) * (dt * 0.1)
    linesData[i].angleVel *= GLOBAL_STATE.linesSpring
    linesData[i].angle += linesData[i].angleVel

    linesRotationsArray[i] = linesData[i].angle
    labelTransformsArray[i * 3 + 2] = -linesData[i].angle
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, linesOffsetsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, linesOffsetsArray, gl.STATIC_DRAW)
  gl.bindBuffer(gl.ARRAY_BUFFER, linesRotationBuffers)
  gl.bufferData(gl.ARRAY_BUFFER, linesRotationsArray, gl.STATIC_DRAW)

  gl.bindBuffer(gl.ARRAY_BUFFER, labelTransformsBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, labelTransformsArray, gl.STATIC_DRAW)

  gl.bindBuffer(gl.ARRAY_BUFFER, null)

  // ------- Render our scene -------
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  if (!GLOBAL_STATE.debugMode && !GLOBAL_STATE.disablePostProcessing) {
    // Bind framebuffer to render the balls to
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer)
  }

  // Clear framebuffer before drawing
  gl.clearColor(0.1, 0.1, 0.1, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  {
    const drawMode = GLOBAL_STATE.debugMode ? gl.LINE_LOOP : gl.TRIANGLES
    vaoExtension.bindVertexArrayOES(labelVAO)
    gl.useProgram(labelProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, label0Texture)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, label1Texture)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, label2Texture)
    gl.uniform1iv(u_labelTexturesArray, [0, 1, 2])
    instanceExtension.drawArraysInstancedANGLE(drawMode, 0, 6, GLOBAL_STATE.linesCount)
    gl.useProgram(null)
    vaoExtension.bindVertexArrayOES(null)
    gl.bindTexture(gl.TEXTURE_2D, null)
  }

  {
    const drawMode = GLOBAL_STATE.debugMode ? gl.LINE_LOOP : gl.TRIANGLES
    vaoExtension.bindVertexArrayOES(ballsVao)
    gl.useProgram(ballsProgram)
    instanceExtension.drawArraysInstancedANGLE(drawMode, 0, 6, GLOBAL_STATE.particleCount)
    gl.useProgram(null)
    vaoExtension.bindVertexArrayOES(null)
  }

  if (!GLOBAL_STATE.debugMode && !GLOBAL_STATE.disablePostProcessing) {
    // Unbind framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }
  if (!GLOBAL_STATE.debugMode && !GLOBAL_STATE.disablePostProcessing) {
    // Render post processing quad
    vaoExtension.bindVertexArrayOES(planeVao)
    gl.useProgram(planeProgram)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, targetTexture)
    gl.uniform1i(u_targetTexture, 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    gl.bindTexture(gl.TEXTURE_2D, null)
    gl.useProgram(null)
    vaoExtension.bindVertexArrayOES(null)
  }

  // // Render lines
  vaoExtension.bindVertexArrayOES(linesVao)
  gl.useProgram(linesProgram)
  instanceExtension.drawArraysInstancedANGLE(gl.LINES, 0, 2, GLOBAL_STATE.linesCount)
  gl.useProgram(null)
  vaoExtension.bindVertexArrayOES(null)

  // Issue next draw
  requestAnimationFrame(renderFrame)
}

// ------- Helpers -------
function createLabelTexture(label) {
  const canvas = document.createElement('canvas')
  canvas.width = labelWidth
  canvas.height = labelHeight

  // canvas.setAttribute('style', `
  //   position: fixed;
  //   top: 1rem;
  //   left: 1rem;
  // `)
  // document.body.appendChild(canvas)

  const ctx = canvas.getContext('2d')
  const fontSize = 100
  ctx.font = `${fontSize}px ${GLOBAL_STATE.labelFontFamily}`
  ctx.fillStyle = 'green'
  ctx.textAlign = 'center'
  const textMetrics = ctx.measureText(label)

  const widthDelta = labelWidth / textMetrics.width
  ctx.font = `${fontSize * widthDelta}px ${GLOBAL_STATE.labelFontFamily}`
  ctx.fillText(label, canvas.width / 2, canvas.height)

  const texture = gl.createTexture()
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  tagDebugGLObject(texture, `Label texture: ${label}`)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.bindTexture(gl.TEXTURE_2D, null)

  return texture
}

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
        vy1 *= -GLOBAL_STATE.lineBounceScale

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

// ------- WebGL Helpers -------
function tagDebugGLObject(object, objectName) {
  if (process.env.NODE_ENV === 'development') {
    webglDebugExtension.tagObject(object, objectName)
  }
}

function makeShader(gl, { shaderType, shaderSource }) {
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

function makeProgram(gl, { vertexShaderSource, fragmentShaderSource }) {
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

function orthographic({ left, right, bottom, top, near, far }) {
  return new Float32Array([
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, 2 / (near - far), 0,

    (left + right) / (left - right),
    (bottom + top) / (bottom - top),
    (near + far) / (near - far),
    1,
  ])
}

function isMobileBrowser() {
  return (function (a) {
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
      return true
    }
    return false
  })(navigator.userAgent || navigator.vendor || window.opera)
}

function isIPadOS() {
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !window.MSStream
}

function isIPad() {
  return navigator.userAgent.match(/iPad/i) !== null || isIPadOS()
}
