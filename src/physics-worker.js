import {
  EVT_INIT_WORLD,
  EVT_REQUEST_UPDATE_WORLD,
  EVT_UPDATED_WORLD,
} from './constants'

import calculatePhysics from './calculate-physics'

let globalState = {}

onmessage = function(e) {
  if (e.data.type === EVT_INIT_WORLD) {
    globalState = Object.assign(globalState, e.data)
  } else if (e.data.type === EVT_REQUEST_UPDATE_WORLD) {
    const {
      velocitiesArray,
      offsetsArray,
      oldOffsetsArray,
    } = calculatePhysics(e.data, globalState)

    postMessage({
      type: EVT_UPDATED_WORLD,
      velocitiesArray,
      offsetsArray,
      oldOffsetsArray
    }, velocitiesArray.buffer, offsetsArray.buffer, oldOffsetsArray.buffer)
  }
}
