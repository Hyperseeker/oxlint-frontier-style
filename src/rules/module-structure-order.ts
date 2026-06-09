/**
 * @file Rule: enforce top-level declaration order.
 */

import type { Context, ESTree, Rule, Visitor } from "@oxlint/plugins";

import {
	asVariableDeclaration,
	isExportStatement,
	unwrapExport,
} from "../shared/ast.ts";

/**
 * Human-readable labels for each declaration rank, keyed by descending priority.
 */
const RANK_LABELS: Record<number, string> = {
	1: "Imports",
	2: "Type aliases",
	3: "Interfaces",
	4: "`const` declarations",
	5: "`let` declarations",
	6: "Functions",
	7: "Exports",
};

/**
 * Rank of the trailing exports group.
 *
 * TODO: unhardcode
 */
const RANK_EXPORTS = 7;

/**
 * Returns rank of a non-export declaration, or `null` if it is not a ranked declaration kind.
 */
function rankOfDeclaration(node: ESTree.Node): number | null {
	if (node.type === "ImportDeclaration") return 1;
	if (node.type === "TSTypeAliasDeclaration") return 2;
	if (node.type === "TSInterfaceDeclaration") return 3;
	if (node.type === "FunctionDeclaration") return 6;

	const declaration = asVariableDeclaration(node);

	if (declaration === null) return null;

	return declaration.kind === "const" ? 4 : 5;
}

/**
 * Returns rank of any top-level statement, including exports.
 * Exports unwrap to the rank of their inner declaration, or the trailing exports rank when bare.
 */
function rankOf(node: ESTree.Node): number | null {
	if (
		node.type === "ExportDefaultDeclaration" ||
		node.type === "ExportAllDeclaration"
	)
		return RANK_EXPORTS;

	if (node.type === "ExportNamedDeclaration") {
		const inner = unwrapExport(node);

		// * bare `export { … }` has no inner declaration and is a trailing export
		return inner === node ? RANK_EXPORTS : rankOfDeclaration(inner);
	}

	return rankOfDeclaration(node);
}

/**
 * Walks the program body and reports any statement whose rank falls below a rank already seen.
 */
function checkProgram(context: Context, node: ESTree.Program): void {
	let maxRank = 0;

	for (const statement of node.body) {
		const rank = rankOf(statement);

		if (rank === null) continue;

		if (rank < maxRank) {
			const label =
				isExportStatement(statement) && rank === RANK_EXPORTS
					? RANK_LABELS[7]
					: RANK_LABELS[rank];

			context.report({
				node: statement,
				messageId: "outOfOrder",
				data: { kind: label ?? "Declaration" },
			});

			continue;
		}

		maxRank = rank;
	}
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Enforce top-level declaration order: imports, types, interfaces, constants, functions, exports.",
			recommended: true,
		},
		messages: {
			outOfOrder:
				"{{kind}} are out of order. Expected: imports, types, interfaces, const, let, functions, exports.",
		},
	},

	create(context: Context): Visitor {
		return {
			Program(node: ESTree.Program): void {
				checkProgram(context, node);
			},
		};
	},
} satisfies Rule;
