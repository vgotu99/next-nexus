import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/client/index.ts', 'src/server/index.ts', 'src/errors/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  tsconfig: 'tsconfig.build.json',
  sourcemap: false,
  clean: true,
  splitting: false,
  target: 'es2022',
  external: ['react', 'react-dom', 'next'],
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
    };
  },
});
