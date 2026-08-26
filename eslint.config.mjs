// Minimal ESLint flat config for Next.js 16+ projects. The Next-supplied
// `eslint-config-next` pulls in `eslint-plugin-react@7.37.5` which crashes
// against `eslint@10` (`contextOrFilename.getFilename is not a function`).
// Tracking the full migration to `eslint-config-next`'s flat preset via
// `next/codemod next-lint-to-eslint-cli` once the upstream plugin graph is
// compatible. Until then this config applies `@typescript-eslint` and
// `eslint-plugin-react-hooks` on `src/**` so the `pnpm lint` check produces
// useful output for newly added server actions and other typed code.

import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";

/** @type {import("eslint").Linter.Config[]} */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "next-env.d.ts",
      "out/**",
      "build/**",
      ".kimchi/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-undef": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
