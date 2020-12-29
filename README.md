# Happy New Year 2021 - Animation

Ball physics animation written in direct WebGL to celebrate the end of 2020.

- Uses hardware instancing with `ANGLE_instanced_arrays` for minimum draw calls
- Supports VAOs with `OES_vertex_array_object` to organise buffer and attributes state and reduce WebGL calls
- Post processing step using fullscreen quad for the metaball gooey effect
- Custom animation and physics written from scratch

url: [https://happy-new-2021.georgi-nikolov.com/](https://happy-new-2021.georgi-nikolov.com/)

![Animation Preview Render](https://happy-new-2021.georgi-nikolov.com/assets/happy-new-year-site-preview-social.png)

## Performance Test
TODO

## References
I studied 2D balls physics and collision detection and created this [Codepen collection](https://codepen.io/collection/nLvrwY) to document my progress.

- [Collision detection (MDN Article)](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Collision_detection)
- [Foundation HTML5 Animation with JavaScript](https://lamberta.github.io/html5-animation/)

