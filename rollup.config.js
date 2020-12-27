import typescript from '@rollup/plugin-typescript'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import glslify from 'rollup-plugin-glslify'
import webWorkerLoader from 'rollup-plugin-web-worker-loader'

export default {
  input: 'src/index.ts',
  output: {
    file: 'dist/bundle.js',
    format: 'iife'
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    glslify(),
    webWorkerLoader(/* configuration */)
  ]
}