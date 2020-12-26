let innerWidth
let innerHeight
let radius
let particleCount
let gravity
let bounceScale

onmessage = function(e) {
  if (e.data.type === 'init') {
    innerWidth = e.data.innerWidth
    innerHeight = e.data.innerHeight
    radius = e.data.radius
    particleCount = e.data.particleCount
    gravity = e.data.gravity
    bounceScale = e.data.bounceScale
  } else if (e.data.type === 'update-world') {
    const { velocitiesArray, offsetsArray } = e.data
    for (let i = 0; i < particleCount; i++) {
      velocitiesArray[i * 2 + 1] += gravity

      offsetsArray[i * 2] += velocitiesArray[i * 2]
      offsetsArray[i * 2 + 1] += velocitiesArray[i * 2 + 1]

      if (offsetsArray[i * 2] - radius / 2 < 0) {
        offsetsArray[i * 2] = radius / 2
        velocitiesArray[i * 2] *= -1 * bounceScale
      } else if (offsetsArray[i * 2] + radius / 2 > innerWidth) {
        offsetsArray[i * 2] = innerWidth - radius / 2
        velocitiesArray[i * 2] *= -1 * bounceScale
      }

      if (offsetsArray[i * 2 + 1] + radius / 2 > innerHeight) {
        offsetsArray[i * 2 + 1] = innerHeight - radius / 2
        velocitiesArray[i * 2 + 1] *= -1 * bounceScale
      }
    }
    postMessage({
      velocitiesArray,
      offsetsArray
    }, velocitiesArray.buffer, offsetsArray.buffer) 
  }
}