/**
 * @file Rule: separate adjacent statements of different block type with exactly one blank line.
 */

import type { Comment, Context, ESTree, Rule, Visitor } from "@oxlint/plugins";

import { asVariableDeclaration, unwrapExport } from "../shared/ast.ts";

/**
 * A CODE_STYLE block type. Adjacent statements of different types need a blank line between them.
 */
type BlockType =
	| "const"
	| "const-multiline"
	| "let"
	| "let-multiline"
	| "call"
	| "assign"
	| "guard"
	| "conditional"
	| "try"
	| "return"
	| "comment"
	| "other";

/**
 * One spacing unit: a statement (with any attached comments folded in) or a standalone comment run.
 */
interface Item {
	kind: BlockType;
	startLine: number;
	endLine: number;
	node: ESTree.Node | null;
}

/**
 * Result of splitting a statement's leading comments into the run attached to it and the standalone comments that precede that run.
 */
interface SplitComments {
	attachedStartLine: number;
	standalone: Comment[];
}

/**
 * Statement types treated as a `return` block.
 */
const RETURN_TYPES = new Set([
	"ReturnStatement",
	"ThrowStatement",
	"ContinueStatement",
	"BreakStatement",
]);

/**
 * Narrows a node to an `ExpressionStatement`.
 * Returns `null` if the node is not one.
 */
function asExpressionStatement(
	node: ESTree.Node,
): ESTree.ExpressionStatement | null {
	return node.type === "ExpressionStatement" ? node : null;
}

/**
 * Narrows a node to an `IfStatement`.
 * Returns `null` if the node is not one.
 */
function asIfStatement(node: ESTree.Node): ESTree.IfStatement | null {
	return node.type === "IfStatement" ? node : null;
}

/**
 * Counts the fully-blank lines between two nodes or comments.
 */
function blankLinesBetween(
	first: ESTree.Node | Comment,
	second: ESTree.Node | Comment,
): number {
	return second.loc.start.line - first.loc.end.line - 1;
}

/**
 * Whether the node spans more than one line.
 */
function isMultiline(node: ESTree.Node): boolean {
	return node.loc.start.line !== node.loc.end.line;
}

/**
 * Classifies a `const`/`let` declaration, including by whether is spans one line or multiple.
 */
function classifyVariable(node: ESTree.Node, kind: string): BlockType {
	if (kind === "const")
		return isMultiline(node) ? "const-multiline" : "const";

	return isMultiline(node) ? "let-multiline" : "let";
}

/**
 * Classifies an expression statement by its expression kind.
 */
function classifyExpression(expression: ESTree.Node): BlockType {
	if (expression.type === "AssignmentExpression") return "assign";
	if (expression.type === "CallExpression") return "call";
	if (expression.type === "AwaitExpression") return "call";

	return "other";
}

/**
 * Classifies an `if` statement as a `guard` (single early-exit, no `else`) or a general `conditional`.
 */
function classifyIf(
	consequent: ESTree.Node,
	alternate: ESTree.Node | null,
): BlockType {
	const isGuard =
		alternate === null &&
		consequent.type !== "BlockStatement" &&
		RETURN_TYPES.has(consequent.type);

	return isGuard ? "guard" : "conditional";
}

/**
 * Classifies a statement node into its block type.
 */
function classifyStatement(node: ESTree.Node): BlockType {
	const target = unwrapExport(node);

	const declaration = asVariableDeclaration(target);

	if (declaration !== null)
		return classifyVariable(declaration, declaration.kind);

	const expressionStatement = asExpressionStatement(target);

	if (expressionStatement !== null)
		return classifyExpression(expressionStatement.expression);

	const ifStatement = asIfStatement(target);

	if (ifStatement !== null)
		return classifyIf(ifStatement.consequent, ifStatement.alternate);

	if (target.type === "SwitchStatement") return "conditional";
	if (target.type === "TryStatement") return "try";
	if (RETURN_TYPES.has(target.type)) return "return";

	return "other";
}

/**
 * Splits a statement's leading comments into the run attached to it (no blank line between) and the standalone comments that precede that run.
 */
function splitAttachedComments(
	leading: Comment[],
	statement: ESTree.Node,
): SplitComments {
	let attachedStartLine = statement.loc.start.line;
	let cursorLine = statement.loc.start.line;
	let splitIndex = leading.length;

	for (let index = leading.length - 1; index >= 0; index--) {
		const comment = leading[index];

		if (comment === undefined) break;
		if (comment.loc.end.line !== cursorLine - 1) break;

		attachedStartLine = comment.loc.start.line;
		cursorLine = comment.loc.start.line;
		splitIndex = index;
	}

	return { attachedStartLine, standalone: leading.slice(0, splitIndex) };
}

/**
 * Appends standalone comments to `items` as `comment` blocks, grouping runs separated by a blank line into distinct items.
 */
function pushCommentItems(items: Item[], comments: Comment[]): void {
	let group: Comment[] = [];

	function flush(): void {
		const first = group[0];
		const last = group[group.length - 1];

		if (first === undefined || last === undefined) return;

		items.push({
			kind: "comment",
			startLine: first.loc.start.line,
			endLine: last.loc.end.line,
			node: null,
		});
	}

	for (const comment of comments) {
		const previous = group[group.length - 1];

		if (
			previous !== undefined &&
			blankLinesBetween(previous, comment) > 0
		) {
			flush();

			group = [];
		}

		group.push(comment);
	}

	flush();
}

/**
 * Builds the ordered list of spacing items for a statement body.
 */
function buildItems(context: Context, body: ESTree.Node[]): Item[] {
	const items: Item[] = [];

	for (const statement of body) {
		const leading = context.sourceCode.getCommentsBefore(statement);

		const { attachedStartLine, standalone } = splitAttachedComments(
			leading,
			statement,
		);

		pushCommentItems(items, standalone);

		items.push({
			kind: classifyStatement(statement),
			startLine: attachedStartLine,
			endLine: statement.loc.end.line,
			node: statement,
		});
	}

	return items;
}

/**
 * Reports adjacent items of different block type that have no blank line between them.
 */
function checkBody(context: Context, body: ESTree.Node[]): void {
	const items = buildItems(context, body);

	for (let index = 1; index < items.length; index++) {
		const previous = items[index - 1];
		const current = items[index];

		if (previous === undefined || current === undefined) continue;
		if (previous.kind === current.kind) continue;

		const gap = current.startLine - previous.endLine - 1;

		if (gap !== 0) continue;

		const data = { before: previous.kind, after: current.kind };

		if (current.node === null) {
			context.report({
				loc: { line: current.startLine, column: 0 },
				messageId: "missingBlankLine",
				data,
			});

			continue;
		}

		context.report({
			node: current.node,
			messageId: "missingBlankLine",
			data,
		});
	}
}

export default {
	meta: {
		type: "layout",
		docs: {
			description:
				"Separate adjacent statements of different block type with exactly one blank line.",
			recommended: true,
		},
		messages: {
			missingBlankLine:
				"Expected a blank line between `{{before}}` and `{{after}}` blocks.",
		},
	},

	create(context: Context): Visitor {
		return {
			Program(node: ESTree.Program): void {
				checkBody(context, node.body);
			},

			BlockStatement(node: ESTree.BlockStatement): void {
				checkBody(context, node.body);
			},
		};
	},
} satisfies Rule;
