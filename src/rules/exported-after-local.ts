/**
 * @file Rule: within a group (`const`/`let`/functions), local declarations must precede exported ones.
 */

import type { Context, ESTree, Rule, Visitor } from "@oxlint/plugins";

import {
	asVariableDeclaration,
	isExportStatement,
	unwrapExport,
} from "../shared/ast.ts";

/**
 * Returns the group key of a declaration (`function`/`const`/`let`), or `null` if it does not belong to a tracked group.
 */
function groupKeyOf(node: ESTree.Node): string | null {
	const inner = unwrapExport(node);

	if (inner.type === "FunctionDeclaration") return "function";

	const declaration = asVariableDeclaration(inner);

	if (declaration === null) return null;

	return declaration.kind === "const" ? "const" : "let";
}

/**
 * Reports any local declaration that appears after an exported one within the same group.
 */
function checkProgram(context: Context, node: ESTree.Program): void {
	const exportedGroups = new Set<string>();

	for (const statement of node.body) {
		const group = groupKeyOf(statement);

		if (group === null) continue;

		const exported = isExportStatement(statement);

		if (exported) {
			exportedGroups.add(group);

			continue;
		}

		if (exportedGroups.has(group)) {
			context.report({
				node: statement,
				messageId: "exportBeforeLocal",
				data: { group },
			});
		}
	}
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require local declarations to precede exported ones within each `const`/`let`/function group.",
			recommended: true,
		},
		messages: {
			exportBeforeLocal:
				"Non-exported `{{group}}` declarations must come before exported ones.",
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
