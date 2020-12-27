let oldTime = 0

const calculatePhysics = ({
  velocitiesArray,
  offsetsArray
}, {
  particlesCount,
  gravity,
  radius,
  bounceScale,
  innerWidth,
  innerHeight
}) => {
  const now = performance.now()
  const dt = now - oldTime
  oldTime = now

  const checkWall = i => {
    if (offsetsArray[i * 2 + 0] < radius / 2) {
      offsetsArray[i * 2] = radius / 2
      velocitiesArray[i * 2] *= -bounceScale
    } else if (offsetsArray[i * 2] + radius / 2 > innerWidth) {
      offsetsArray[i * 2] = innerWidth - radius / 2
      velocitiesArray[i * 2] *= -bounceScale
    }

    if (offsetsArray[i * 2 + 1] + radius / 2 > innerHeight) {
      offsetsArray[i * 2 + 1] = innerHeight - radius / 2
      velocitiesArray[i * 2 + 1] *= -bounceScale

      // offsetsArray[i * 2 + 1] = Math.random() * -innerHeight
    }
  }
  const rotate = (x, y, sin, cos, reverse) => {
    return {
      x: reverse ? x * cos + y * sin : x * cos - y * sin,
      y: reverse ? y * cos - x * sin : y * cos + x * sin
    }
  }
  const checkCollision = (i0, i1) => {
    // debugger
    const ball0x = offsetsArray[i0 * 2 + 0]
    const ball0y = offsetsArray[i0 * 2 + 1]
    const ball1x = offsetsArray[i1 * 2 + 0]
    const ball1y = offsetsArray[i1 * 2 + 1]

    const ball0vx = velocitiesArray[i0 * 2 + 0]
    const ball0vy = velocitiesArray[i0 * 2 + 1]
    const ball1vx = velocitiesArray[i1 * 2 + 0]
    const ball1vy = velocitiesArray[i1 * 2 + 1]

    const dx = ball1x - ball0x
    const dy = ball1y - ball0y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const minDist = radius / 2 + radius / 2

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

      const ball0 = { mass: 1 }
      const ball1 = { mass: 1 }

      vel0.x = ((ball0.mass - ball1.mass) * vel0.x + 2 * ball1.mass * vel1.x) /
        (ball0.mass + ball1.mass)
      vel1.x = vxTotal + vel0.x

      const absV = Math.abs(vel0.x) + Math.abs(vel1.x)
      const overlap = (radius / 2 + radius / 2) - Math.abs(pos0.x - pos1.x)
      pos0.x += vel0.x / absV * overlap
      pos1.x += vel1.x / absV * overlap

      //rotate positions back
      const pos0F = rotate(pos0.x, pos0.y, sin, cos, false)
      const pos1F = rotate(pos1.x, pos1.y, sin, cos, false)

      //adjust positions to actual screen positions
      offsetsArray[i0 * 2 + 0] = ball0x + pos0F.x
      offsetsArray[i0 * 2 + 1] = ball0y + pos0F.y
      offsetsArray[i1 * 2 + 0] = ball0x + pos1F.x
      offsetsArray[i1 * 2 + 1] = ball0y + pos1F.y

      //rotate velocities back
      const vel0F = rotate(vel0.x, vel0.y, sin, cos, false)
      const vel1F = rotate(vel1.x, vel1.y, sin, cos, false)

      velocitiesArray[i0 * 2 + 0] = vel0F.x
      velocitiesArray[i0 * 2 + 1] = vel0F.y
      velocitiesArray[i1 * 2 + 0] = vel1F.x
      velocitiesArray[i1 * 2 + 1] = vel1F.y
    }
  }

  for (let i = 0; i < particlesCount; i++) {
    velocitiesArray[i * 2 + 1] += gravity
    offsetsArray[i * 2 + 0] += velocitiesArray[i * 2 + 0] * (dt * 0.005)
    offsetsArray[i * 2 + 1] += velocitiesArray[i * 2 + 1] * (dt * 0.005)
    checkWall(i)
  }

  for (let i = 0; i < particlesCount; i++) {
    for (let j = i + 1; j < particlesCount; j++) {
      checkCollision(i, j)
    }
  }

  return { velocitiesArray, offsetsArray }
}

export default calculatePhysics
