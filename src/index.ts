/**
 * @file Entry point for the plugin.
 */

import type { Plugin } from "@oxlint/plugins";

import blockTypeSpacing from "./rules/block-type-spacing.ts";
import exportedAfterLocal from "./rules/exported-after-local.ts";
import constScreamingSnake from "./rules/module-const-screaming-snake.ts";
import moduleStructureOrder from "./rules/module-structure-order.ts";
import requireFileJsdoc from "./rules/require-file-jsdoc.ts";
import requireJsdoc from "./rules/require-jsdoc.ts";

/**
 * Exported plugin.
 */
const PLUGIN: Plugin = {
	// * `meta.name` defines rule prefix
	// * e.g. `meta.name` `frontier-style` → rule `frontier-style/no-fucking-around`
	meta: { name: "frontier-style" },
	rules: {
		"module-const-screaming-snake": constScreamingSnake,
		"require-file-jsdoc": requireFileJsdoc,
		"require-jsdoc": requireJsdoc,
		"module-structure-order": moduleStructureOrder,
		"exported-after-local": exportedAfterLocal,
		"block-type-spacing": blockTypeSpacing,
	},
};

export default PLUGIN;
