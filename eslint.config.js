import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // public/ holds vendored, prebuilt bundles (the 17 MB Scratch editor, the
  // React UMD builds) plus small hand-written host scripts that are plain
  // browser IIFEs, not modules. Linting any of it is noise.
  globalIgnores(['dist', 'public']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Providers deliberately live next to the hook that reads them
      // (AuthContext/useAuth, ToastProvider/useToast). The only cost is
      // slightly coarser Fast Refresh in those two files.
      'react-refresh/only-export-components': 'off',

      // Fetching a page's data on mount is exactly what these effects are for.
      // The rule targets synchronous cascading renders; every call site here
      // sets state only after an awaited request resolves.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Build config runs in Node, not the browser.
    files: ['*.config.js'],
    languageOptions: { globals: globals.node },
  },
])
