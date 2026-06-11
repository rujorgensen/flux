import { defineConfig } from 'oxlint';

export default defineConfig({
    plugins: [
        'typescript',
    ],
    categories: {
        correctness: 'error',
        suspicious: 'warn',
        perf: 'warn',
    },
    options: {
        typeAware: true,
        reportUnusedDisableDirectives: 'warn',
    },
    rules: {
        '@typescript-eslint/no-extraneous-class': [
            'error',
            {
                allowWithDecorator: true,
            },
        ],
        'typescript/no-unsafe-type-assertion': 'warn', // Change to error later
        'typescript/consistent-return': 'error', // Change to error later
        'typescript/no-unnecessary-type-conversion': 'warn', // Change to error later
        'typescript/no-useless-default-assignment': 'error', // Change to error later
        'typescript/no-unnecessary-type-parameters': 'warn', // Change to error later
        'consistent-return': 'error',
        'no-console': 'error',
        'eqeqeq': 'error',
        '@typescript-eslint/no-unnecessary-condition': 'error',
        'no-alert': 'warn',// Change to error later
        'oxc/approx-constant': 'error',
        'typescript/no-floating-promises': 'error',
        'typescript/no-unsafe-assignment': 'warn',
        'typescript/no-extraneous-class': [
            'warn', // Change to error later
            {
                allowWithDecorator: true,
            },
        ],
        'eslint/no-console': 'off',
        'eslint/no-debugger': 'error',
        'eslint/no-underscore-dangle': 'off',
        'eslint/no-unused-vars': 'error',
        'eslint/eqeqeq': [
            'error',
            'always',
        ],
        'eslint/no-var': 'error',
        'eslint/prefer-const': 'error',
        'eslint/no-duplicate-imports': 'error',
        'unicorn/filename-case': [
            'error',
            {
                case: 'kebabCase',
                ignore: [
                    '^README\\.md$',
                    '^CHANGELOG\\.md$',
                    '^LICENSE(\\.md)?$',
                    '^AGENTS\\.md$',
                    '^CLAUDE\\.md$',
                ],
            },
        ]
    },
    ignorePatterns: [
        'node_modules',
        'dist',
        '.nx',
        '.angular',
        '.github',
        '@prisma-types',
    ],
});
