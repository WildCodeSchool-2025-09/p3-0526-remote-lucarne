import { base, node, react, typescript } from "@lucarne/eslint-config";

export default [
  { ignores: ["output/**"] },
  ...base,
  ...typescript,
  {
    ...node,
    files: [
      "*.{js,mjs,cjs}",
      "apps/api/**/*.{js,ts}",
      "apps/web/vite.config.ts",
      "bin/**/*.{js,mjs,cjs}",
      "packages/eslint-config/**/*.{js,mjs,cjs}",
    ],
  },
  {
    ...react,
    files: ["apps/web/src/**/*.{ts,tsx}"],
  },
];
