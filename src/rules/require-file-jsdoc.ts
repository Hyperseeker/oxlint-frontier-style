/**
 * @file Rule: every file must open with a JSDoc block with a `@file` declaration before the first statement.
 */

import type { Comment, Context, ESTree, Rule, Visitor } from "@oxlint/plugins";

/**
 * Whether the comment is a block JSDoc containing an `@file` tag.
 */
function isFileJsdoc(comment: Comment): boolean {
	return (
		comment.type === "Block" &&
		comment.value.startsWith("*") &&
		comment.value.includes("@file")
	);
}

/**
 * Reports when the file does not open with a `@file` JSDoc block before the first statement.
 */
function checkProgram(context: Context, node: ESTree.Program): void {
	const comments = context.sourceCode.getAllComments();

	const firstComment = comments.find((comment) => comment.type !== "Shebang");

	const firstStatement = node.body[0];

	// * an empty file has nothing to document
	if (firstStatement === undefined && comments.length === 0) return;

	const isBeforeBody =
		firstComment !== undefined &&
		(firstStatement === undefined ||
			firstComment.range[0] < firstStatement.range[0]);

	if (firstComment !== undefined && isBeforeBody && isFileJsdoc(firstComment))
		return;

	context.report({
		loc: { line: 1, column: 0 },
		messageId: "missingFileJsdoc",
	});
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require every file to open with a `@file` JSDoc block before the first statement.",
			recommended: true,
		},
		messages: {
			missingFileJsdoc:
				"File must begin with a `/** … @file … */` JSDoc block.",
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
