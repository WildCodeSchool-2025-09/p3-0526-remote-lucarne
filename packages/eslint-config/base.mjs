import eslint from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import globals from "globals";

const javascriptFiles = ["**/*.{js,mjs,cjs}"];
const sourceFiles = ["**/*.{js,mjs,cjs,ts,tsx,mts,cts}"];

export default [
  {
    ignores: ["**/coverage/**", "**/dist/**", "**/node_modules/**"],
  },
  {
    ...eslint.configs.recommended,
    files: javascriptFiles,
    languageOptions: {
      globals: globals.es2021,
    },
  },
  {
    files: sourceFiles,
    plugins: {
      "@stylistic": stylistic,
    },
    rules: {
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/indent": ["error", 2],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/semi": ["error", "always"],
    },
  },
];
