import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/entrypoints/index.ts',
    'client/index': 'src/entrypoints/client/index.ts',
    'server/index': 'src/entrypoints/server/index.ts',
    'server/browser-stub': 'src/entrypoints/server/browser-stub.ts',
    'errors/index': 'src/entrypoints/errors/index.ts',
    'internal-client/index': 'src/entrypoints/internal-client/index.ts',
    'internal/index': 'src/entrypoints/internal/index.ts',
  },
  format: ['esm'],
  dts: true,
  tsconfig: 'tsconfig.build.json',
  sourcemap: false,
  clean: true,
  splitting: true,
  target: 'es2022',
  external: ['react', 'react-dom', 'next'],
});
