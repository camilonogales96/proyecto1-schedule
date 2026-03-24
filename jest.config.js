modeule.exports = {
    testEnvironment: 'node',
    coverageDirectory: 'coverage',

    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
    ],
    testMatch: [
        '**/tests/**/*.test.ts',
        '**/?(*.)+(spec|test).ts',
    ],
    verbose: true,
};