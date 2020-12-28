let oldTime = 0

const calculatePhysics = ({
  velocitiesArray,
  oldOffsetsArray,
  offsetsArray,
  linesOffsetsArray,
  linesRotationsArray,
  linesVertexArray,
}, {
  particlesCount,
  gravity,
  radius,
  bounceScale,
  innerWidth,
  innerHeight,
}) => {
  const now = performance.now()
  const dt = now - oldTime
  oldTime = dt

  const getLineBounds = i => {
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

  const move = i => {
    velocitiesArray[i * 2 + 1] += gravity
    offsetsArray[i * 2 + 0] += velocitiesArray[i * 2 + 0] * (dt * 0.01)
    offsetsArray[i * 2 + 1] += velocitiesArray[i * 2 + 1] * (dt * 0.01)
  }

  const checkWall = i => {
    if (offsetsArray[i * 2 + 0] < radius / 2) {
      offsetsArray[i * 2] = radius / 2
      velocitiesArray[i * 2] *= -bounceScale
    }
    if (offsetsArray[i * 2] + radius / 2 > innerWidth) {
      offsetsArray[i * 2] = innerWidth - radius / 2
      velocitiesArray[i * 2] *= -bounceScale
    }

    // if (offsetsArray[i * 2 + 1] < radius / 2) {
    //   offsetsArray[i * 2 + 1] = radius / 2
    //   velocitiesArray[i * 2 + 1] *= -bounceScale
    // }
    if (offsetsArray[i * 2 + 1] - radius / 2 > innerHeight) {
      offsetsArray[i * 2 + 1] = -radius
      velocitiesArray[i * 2 + 1] = 0
    }
  }

  const checkLine = lineIdx => {
    const lineBounds = getLineBounds(lineIdx)

    for (let i = 0; i < particlesCount; i++) {
      const ballx = offsetsArray[i * 2 + 0]
      const bally = offsetsArray[i * 2 + 1]
      const ballvx = velocitiesArray[i * 2 + 0]
      const ballvy = velocitiesArray[i * 2 + 1]

      if (ballx + radius / 2 > lineBounds.x && ballx - radius / 2 < lineBounds.x + lineBounds.width) {
        const lineRotation = linesRotationsArray[lineIdx]
        const cos = Math.cos(lineRotation)
        const sin = Math.sin(lineRotation)

        let x = ballx - linesOffsetsArray[lineIdx * 2 + 0]
        let y = bally - linesOffsetsArray[lineIdx * 2 + 1]
        let vx1 = cos * ballvx + sin * ballvy
        let vy1 = cos * ballvy - sin * ballvx

        let y1 = cos * y - sin * x

        if (y1 > -radius / 2 && y1 < vy1) {
          const x2 = cos * x + sin * y

          y1 = -radius / 2
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

  for (let i = 0; i < particlesCount; i++) {
    move(i)
    checkWall(i)
  }

  for (let i = 0; i < linesRotationsArray.length; i++) {
    checkLine(i)
  }

  return { velocitiesArray, offsetsArray, oldOffsetsArray }
}

export default calculatePhysics
