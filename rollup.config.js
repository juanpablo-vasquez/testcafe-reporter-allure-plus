import typescript from 'rollup-plugin-typescript2';

export default ['src/index.ts', 'src/utils.ts'].map((input) => ({
  input,
  plugins: [
    typescript({
      tsconfig: 'tsconfig.prod.json',
    }),
  ],
  external: ['allure-js-commons', 'rimraf', 'merge-anything', 'path', 'uuid', 'fs', 'strip-ansi'],
  output: {
    exports: 'auto',
    dir: 'dist',
    format: 'cjs',
  },
}));
