// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Storybook's static build. Its installer rewrote this file and added the
    // storybook plugin but not this ignore, so the first `npm run lint` after
    // `build-storybook` reported 503 errors across minified vendor bundles.
    "storybook-static/**",
    // Git worktrees live here. A worktree is a second checkout of this same
    // repo nested inside it, so without this every file gets linted twice and
    // the worktree's own build output — which the ignores above only match at
    // the root — gets linted at all. One live worktree took `npm run lint`
    // from 2 warnings to 796 errors.
    ".claude/**",
  ]),
  ...storybook.configs["flat/recommended"]
]);

export default eslintConfig;
