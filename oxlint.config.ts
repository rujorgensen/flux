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
        '@typescript-eslint/ts-config-error': 'error',
        'no-alert': 'error',
        'oxc/approx-constant': 'error',
        'no-unused-vars': 'error',
        'typescript/no-floating-promises': 'error',
        'typescript/no-unsafe-assignment': 'warn',
        'typescript/no-extraneous-class': [
            'error',
            {
                allowWithDecorator: true,
            },
        ],
        'eslint/no-console': 'off',
        'eslint/no-debugger': 'error',
        'eslint/no-unused-vars': 'error',
        'eslint/eqeqeq': [
            'error',
            'always',
        ],
        'eslint/no-var': 'error',
        'eslint/prefer-const': 'error',
        'eslint/no-duplicate-imports': 'error',
        'eslint/quotes': [
            'error',
            'single',
            {
                avoidEscape: true,
            },
        ],
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
