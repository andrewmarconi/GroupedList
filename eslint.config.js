// eslint.config.mjs
import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  ...obsidianmd.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
    },

    rules: {
      // TypeScript handles undefined-variable checks; no-undef causes
      // false positives for browser globals (window, setTimeout, etc.)
      "no-undef": "off",
      "obsidianmd/ui/sentence-case": [
        "warn",
        {
          brands: ["Obsidian"],
          acronyms: ["OK", "ID", "YAML"],
          enforceCamelCaseLower: true,
        },
      ],
    },
  },
]);
