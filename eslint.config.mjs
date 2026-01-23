import eslint from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  {
    rules: {
      // Disable core rules
      "no-unused-vars": "off",
      "no-undef": "off",

      // Use TS-aware rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],

      "prefer-const": "error",
      "no-console": "warn",
    },
  },

  {
    ignores: ["**/node_modules/", "**/dist/"],
  },
);
