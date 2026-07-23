module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testMatch: [
    '**/tests/app/**/*.(test|spec).(ts|tsx|js|jsx)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': '<rootDir>/tests/jest-esbuild-transform.cjs',
  },
};
