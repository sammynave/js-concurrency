import pkg from "./package.json";
import filesize from "rollup-plugin-filesize";
import resolve from "rollup-plugin-node-resolve";
import commonjs from 'rollup-plugin-commonjs';
import serve from 'rollup-plugin-serve'
import { terser } from "rollup-plugin-terser";

const isDev = process.env.BUILD === 'dev';
const commonjsPlugin = commonjs();
const filesizePlugin = filesize();

const resolvePlugin = resolve({
  module: true,
  preferBuiltins: true
});

const servePlugin = serve({
  open: true,
  contentBase: ['dist', 'public']
});

const es = {
  input: "src/index.js",
  output: {
    file: pkg.module,
    format: "es",
    sourcemap: true
  },
  plugins: [
    resolvePlugin,
    commonjsPlugin,
    terser(),
    filesizePlugin,
    isDev ? servePlugin : {}
  ]
};

const iife = {
  input: "src/index.js",
  output: {
    file: pkg.browser,
    format: "iife",
    sourcemap: true,
    name: 'jsc'
  },
  plugins: [
    resolvePlugin,
    commonjsPlugin,
    isDev ? {} : terser(),
    filesizePlugin,
    isDev ? servePlugin : {}
  ]
};

export default [es, iife];
