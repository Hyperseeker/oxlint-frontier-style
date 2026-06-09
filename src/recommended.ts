/**
 * @file Shareable preset bundling Frontier's built-in and custom rule configuration.
 */

import type { OxlintConfig } from "oxlint";

/**
 * The recommended config for the projects using the Frontier code style.
 */
const RECOMMENDED: OxlintConfig = {
	plugins: ["eslint", "typescript", "import", "oxc", "promise", "unicorn"],
	jsPlugins: ["oxlint-frontier-style"],
	categories: { correctness: "warn" },
	rules: {
		"prefer-const": "error",
		"id-length": [
			"error",
			{ checkGeneric: false, exceptionPatterns: ["^_.*"] },
		],
		"func-style": ["error", "declaration", { allowArrowFunctions: true }],
		"typescript/consistent-type-imports": "error",
		"typescript/consistent-type-definitions": ["error", "interface"],
		"typescript/explicit-function-return-type": "error",
		"typescript/no-explicit-any": "error",
		"typescript/no-duplicate-type-constituents": "off",
		"import/extensions": [
			"error",
			"always",
			{ ignorePackages: true, checkTypeImports: true },
		],
		"frontier-style/block-type-spacing": "error",
		"frontier-style/module-structure-order": "error",
		"frontier-style/exported-after-local": "error",
		"frontier-style/module-const-screaming-snake": "error",
		"frontier-style/require-file-jsdoc": "error",
		"frontier-style/require-jsdoc": "error",
	},
};

export default RECOMMENDED;
