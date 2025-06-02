export default {
    displayName: 'persistica-flux-authority',
    preset: '../../../jest.preset.esm',
    testEnvironment: 'node',
    transform: {
        '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
    },
    moduleFileExtensions: ['ts', 'js', 'html'],
    coverageDirectory: '../../../coverage/packages/flux/authority',
};
