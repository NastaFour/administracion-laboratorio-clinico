# Expo SDK 54+ Troubleshooting

### 1. Hermes Symbol / Dispatcher Mismatches
- **Symptoms**: `TypeError: Cannot read property 'S' of undefined, js engine: hermes`
- **Cause**: Mismatch between React/RN version bundled by Metro and the native version in Expo Go. SDK 54 requires React 19.1.0 and RN 0.81.5+.
- **Solution**: `npx expo install --fix`

### 2. PNPM Monorepo Resolution Conflicts with Metro
- **Symptoms**: `Error: Cannot find module 'metro-runtime/package.json'`
- **Solution**: Switch pnpm to hoisted node_modules:
  1. Add `node-linker=hoisted` to `.npmrc`
  2. Clear `node_modules` recursively
  3. Run `pnpm install`
  4. Clear Metro cache: `pnpm start -- --clear`

### 3. SafeAreaView Deprecation Warning
- **Symptoms**: `WARN SafeAreaView has been deprecated...`
- **Solution**: Replace `import { SafeAreaView } from 'react-native'` with `import { SafeAreaView } from 'react-native-safe-area-context'`. Wrap in `<SafeAreaProvider>` in `app/_layout.tsx`.

### 4. Expo SDK Package Version Warnings
- **Symptoms**: `The following packages should be updated...`
- **Solution**: `npx expo install --check` then `npx expo install --fix`
