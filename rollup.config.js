import pkg from "./package.json";
import filesize from "rollup-plugin-filesize";
import resolve from "rollup-plugin-node-resolve";
import commonjs from 'rollup-plugin-commonjs';
import serve from 'rollup-plugin-serve'
import { terser } from "rollup-plugin-terser";
import svelte from 'rollup-plugin-svelte';
import typescript from 'rollup-plugin-typescript2';
import tslint from "rollup-plugin-tslint";

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

const typescriptPlugin = typescript({
  
});

const defaultPlugins = [
  tslint({}),
  typescriptPlugin,
  resolvePlugin,
  commonjsPlugin,
  terser(),
  filesizePlugin
];

const es = {
  input: "src/index.ts",
  output: {
    file: pkg.module,
    format: "es",
    sourcemap: true
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
    typescriptPlugin,
    sveltePlugin,
    resolvePlugin,
    commonjsPlugin,
    filesizePlugin,
    isDev ? servePlugin : {}
  ]
};

const exports = isDev ? [docs] : [es, docs];

export default exports;
