const IDEAL_CANVAS_SIZE = 1024

const getCanvasTexture = ({
  size = IDEAL_CANVAS_SIZE,
  headline,
}) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  canvas.width = size
  canvas.height = size
  canvas.setAttribute('style', `
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 99;
  `)
  // document.body.appendChild(canvas)

  const sizeDelta = size / IDEAL_CANVAS_SIZE

  const idealFontSize = 128
  const fontSize = idealFontSize * sizeDelta

  ctx.fillStyle = 'rgb(26, 26, 26)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.font = `${fontSize}px sans-serif`
  const textMetrics = ctx.measureText(headline)

  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.fillText(headline, canvas.width / 2, canvas.height / 2 + textMetrics.actualBoundingBoxAscent / 2)

  return canvas
}

export default getCanvasTexture
