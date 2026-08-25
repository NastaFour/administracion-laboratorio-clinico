import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-electron',
    'release',
    'coverage',
    'node_modules',
    'electron/**/*',
    'src/App.tsx',
    'src/main.tsx',
    'src/components/**/*',
    'src/hooks/**/*',
    'src/vite-env.d.ts',
    'update_pdf_template.js',
    'inject_images.cjs',
    '.atl/**/*',
    '.claude/**/*',
    '.codegraph/**/*',
    '.codeium/**/*',
    '.copilot/**/*',
    '.cursor/**/*',
    '.deepseek/**/*',
    '.gemini/**/*',
    '.kiro/**/*',
    '.opencode/**/*',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
