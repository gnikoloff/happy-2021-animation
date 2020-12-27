const calculatePhysics = (arrays, options) => {
  const { velocitiesArray, offsetsArray } = arrays
  for (let i = 0; i < options.particleCount; i++) {
    velocitiesArray[i * 2 + 1] += options.gravity

    offsetsArray[i * 2] += velocitiesArray[i * 2]
    offsetsArray[i * 2 + 1] += velocitiesArray[i * 2 + 1]

    if (offsetsArray[i * 2] - options.radius / 2 < 0) {
      offsetsArray[i * 2] = options.radius / 2
      velocitiesArray[i * 2] *= -1 * options.bounceScale
    } else if (offsetsArray[i * 2] + options.radius / 2 > options.innerWidth) {
      offsetsArray[i * 2] = options.innerWidth - options.radius / 2
      velocitiesArray[i * 2] *= -1 * options.bounceScale
    }

    if (offsetsArray[i * 2 + 1] + options.radius / 2 > options.innerHeight) {
      offsetsArray[i * 2 + 1] = options.innerHeight - options.radius / 2
      velocitiesArray[i * 2 + 1] *= -1 * options.bounceScale
    }
  }
  return { velocitiesArray, offsetsArray }
}

export default calculatePhysics
