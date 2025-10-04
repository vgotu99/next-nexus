import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'client/index': 'src/client/index.ts',
    'server/index': 'src/server/index.ts',
    'errors/index': 'src/errors/index.ts',
    'internal-client/index': 'src/internal-client/index.ts',
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
