'use strict';

module.exports = {
    verbose: false,
    testRegex: 'tests/(?!utils\\.js).*\\.js',
    testEnvironment: 'node',
    collectCoverageFrom: ['src/**/*.js'],
    coverageThreshold: {
        global: {
            branches: 100,
            functions: 100,
            lines: 100,
            statements: 100,
        },
    },
};
