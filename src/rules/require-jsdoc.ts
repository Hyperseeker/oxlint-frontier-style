/**
 * @file Rule: top-level functions, types, interfaces, and `const`s require a preceding block JSDoc.
 */

import type { Context, ESTree, Rule, Visitor } from "@oxlint/plugins";

import { asVariableDeclaration, unwrapExport } from "../shared/ast.ts";

/**
 * Node types that require a preceding block JSDoc.
 */
const DOCUMENTABLE_TYPES = new Set([
	"FunctionDeclaration",
	"TSTypeAliasDeclaration",
	"TSInterfaceDeclaration",
]);

/**
 * Whether the node is a kind that must carry a block JSDoc.
 */
function isDocumentable(node: ESTree.Node): boolean {
	if (DOCUMENTABLE_TYPES.has(node.type)) return true;

	const declaration = asVariableDeclaration(node);

	return declaration !== null && declaration.kind === "const";
}

/**
 * Whether the comment immediately preceding the statement is a JSDoc.
 */
function hasBlockJsdoc(context: Context, statement: ESTree.Node): boolean {
	const comments = context.sourceCode.getCommentsBefore(statement);

	const last = comments[comments.length - 1];

	return (
		last !== undefined &&
		last.type === "Block" &&
		last.value.startsWith("*")
	);
}

/**
 * Returns a human-readable label for the declaration kind.
 */
function labelFor(node: ESTree.Node): string {
	if (node.type === "FunctionDeclaration") return "Function";
	if (node.type === "TSTypeAliasDeclaration") return "Type";
	if (node.type === "TSInterfaceDeclaration") return "Interface";

	return "Constant";
}

/**
 * Reports a documentable statement that lacks a preceding block JSDoc.
 */
function checkStatement(context: Context, statement: ESTree.Node): void {
	const target = unwrapExport(statement);

	if (!isDocumentable(target)) return;
	if (hasBlockJsdoc(context, statement)) return;

	context.report({
		node: target,
		messageId: "missingJsdoc",
		data: { kind: labelFor(target) },
	});
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require a preceding block JSDoc on top-level functions, types, interfaces, and `const`s.",
			recommended: true,
		},
		messages: {
			missingJsdoc:
				"{{kind}} declaration must have a preceding block JSDoc (`/** … */`).",
		},
	},

	create(context: Context): Visitor {
		return {
			Program(node: ESTree.Program): void {
				for (const statement of node.body) {
					checkStatement(context, statement);
				}
			},
		};
	},
} satisfies Rule;
