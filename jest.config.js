/**
 * Configuración de Jest para la app Next.js (src/).
 * Los tests de packages/avip-contracts usan su propio runner (hardhat) y quedan fuera de este alcance.
 */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          module: 'commonjs',
          moduleResolution: 'node',
          esModuleInterop: true,
          jsx: 'react-jsx',
          strictNullChecks: true,
        },
      },
    ],
  },
};
