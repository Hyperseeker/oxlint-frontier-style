/**
 * @file Shared AST helpers used by multiple rules.
 */

import type { ESTree } from "@oxlint/plugins";

/**
 * Narrows a node to a `VariableDeclaration`, or `null` if it is not one.
 */
export function asVariableDeclaration(
	node: ESTree.Node,
): ESTree.VariableDeclaration | null {
	return node.type === "VariableDeclaration" ? node : null;
}

/**
 * `true` if the node is any `export …` statement.
 */
export function isExportStatement(node: ESTree.Node): boolean {
	return node.type.startsWith("Export");
}

/**
 * Unwrap an `export const`/`export function`/etc. to its inner declaration.
 *
 * Returns the node unchanged if it is not an inline-exported declaration.
 */
export function unwrapExport(node: ESTree.Node): ESTree.Node {
	if (node.type !== "ExportNamedDeclaration") return node;

	return node.declaration ?? node;
}
