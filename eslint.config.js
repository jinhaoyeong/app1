// Flat config. `eslint-config-expo` carries the React Native / Expo rules;
// `eslint-config-prettier` switches off anything that would fight the
// formatter, so lint failures are always real problems, never whitespace.
const expo = require('eslint-config-expo/flat');
const prettier = require('eslint-config-prettier');

module.exports = [
  ...expo,
  prettier,
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'expo-env.d.ts',
      // Vendored design tooling, not our source.
      '.cursor/*',
      '.agents/*',
      '.codex/*',
      '.impeccable/*',
      // Supabase Edge Functions use the Deno runtime and are linted by the
      // Supabase toolchain rather than the Expo/React Native config.
      'supabase/functions/*',
    ],
  },
];
