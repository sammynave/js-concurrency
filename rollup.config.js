import pkg from "./package.json";
import filesize from "rollup-plugin-filesize";
import resolve from "rollup-plugin-node-resolve";
import commonjs from 'rollup-plugin-commonjs';
import serve from 'rollup-plugin-serve'
import { terser } from "rollup-plugin-terser";
import svelte from 'rollup-plugin-svelte';

const isDev = process.env.BUILD === 'dev';
const commonjsPlugin = commonjs();
const filesizePlugin = filesize();

const resolvePlugin = resolve({
  module: true,
  preferBuiltins: true
});

const servePlugin = serve({
  open: true,
  contentBase: ['docs/src', 'docs/public']
});

const sveltePlugin = svelte({
  skipIntroByDefault: true,
  nestedTransitions: true,
  emitCss: false,
  css(css) {
    css.write('docs/public/main.css');
  }
});

const defaultPlugins = [
  resolvePlugin,
  commonjsPlugin,
  terser(),
  filesizePlugin
];

const es = {
  input: "src/index.js",
  output: {
    file: pkg.module,
    format: "es",
    sourcemap: true
  },
  plugins: defaultPlugins
};

const iife = {
  input: "src/index.js",
  output: {
    file: pkg.browser,
    format: "iife",
    sourcemap: true,
    name: 'jsc'
  },
  plugins: defaultPlugins
};

const docs = {
  input: "docs/main.js",
  output: {
    file: 'docs/public/js-concurrency-docs.js',
    format: "umd",
    sourcemap: true,
    name: 'jsc'
  },
  plugins: [
    sveltePlugin,
    resolvePlugin,
    commonjsPlugin,
    filesizePlugin,
    isDev ? servePlugin : {}
  ]
};

const exports = isDev ? [docs] : [es, iife, docs];

export default exports;
