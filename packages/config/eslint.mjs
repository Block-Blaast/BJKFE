import { globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const ignores = globalIgnores(['.next/**', 'out/**', 'build/**', 'dist/**', 'next-env.d.ts']);

// Next 앱용 (apps/*)
export const nextConfig = [
  ...nextVitals,
  ...nextTs,
  {
    files: ['**/*.{jsx,tsx}'],
    rules: {
      // 컴포넌트는 화살표 함수로 통일한다 (.claude/rules/code-style.md)
      'react/function-component-definition': [
        'error',
        { namedComponents: 'arrow-function', unnamedComponents: 'arrow-function' },
      ],
    },
  },
  prettier,
  ignores,
];

// React 컴포넌트가 없는 TS 패키지용 (packages/*)
export const baseConfig = [...nextTs, prettier, ignores];
