import typescript from '@rollup/plugin-typescript'
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import injectProcessEnv from 'rollup-plugin-inject-process-env'
import glslify from 'rollup-plugin-glslify'

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
    injectProcessEnv({ 
      NODE_ENV: process.env.NODE_ENV,
    }),
  ]
}
