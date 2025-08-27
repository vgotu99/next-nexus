import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/**/?(*.)+(spec|test).ts?(x)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  clearMocks: true,
  collectCoverage: true,
  coverageProvider: 'v8',
  coverageReporters: ['text', 'html', 'lcov'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/tests/**',
    '!src/types/**',
    '!src/client/index.ts',
    '!src/constants/errorMessages.ts',
    '!src/errors/NexusError.ts',
    '!src/example.tsx',
  ],
  coverageThreshold: {
    global: { lines: 90, statements: 90, functions: 90, branches: 75 },
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
  testEnvironmentOptions: {
    customExportConditions: ['node'],
  },
};

export default config;
