module.exports = {
    setupFilesAfterEnv: ['<rootDir>/node_modules/jest-enzyme/lib/index.js'],
    preset: '@shelf/jest-mongodb',
    watchPathIgnorePatterns: ['<rootDir>/tmp/', '<rootDir>/node_modules/'],
    roots: ['<rootDir>'],
}
