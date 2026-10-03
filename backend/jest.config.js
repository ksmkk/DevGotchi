module.exports = {
  collectCoverageFrom: [
    'src/**/*.js',
    'db/**/*.js',
    '!src/server.js',
    '!src/**/*.test.js',
  ],
  coverageThreshold: {
    global: {
      statements: 60,
      branches: 60,
      functions: 60,
      lines: 60,
    },
  },
  testEnvironment: 'node',
};
