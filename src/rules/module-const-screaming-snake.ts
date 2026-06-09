/**
 * @file Rule: module-level `const` identifiers must be `SCREAMING_SNAKE_CASE`.
 */

import type { Context, ESTree, Rule, Visitor } from "@oxlint/plugins";

import { asVariableDeclaration, unwrapExport } from "../shared/ast.ts";

/**
 * Options for the rule, passed as the first config element.
 */
interface ModuleConstOptions {
	/** Expections matched by literal value. */
	exceptions?: string[];
	/** Exceptions matched with a regex pattern. */
	exceptionPatterns?: string[];
}

/**
 * Rule identifier, used to prefix option-validation errors.
 */
const RULE_ID = "module-const-screaming-snake";

/**
 * Pattern an identifier must match to be considered `SCREAMING_SNAKE_CASE`.
 */
const SCREAMING_SNAKE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

/**
 * Initializer node types that exempt a `const` from the naming requirement (components and the like).
 */
const EXEMPT_INIT_TYPES = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"ClassExpression",
]);

/**
 * Narrows a node to an `Identifier`.
 * Returns `null` if the node is not one.
 */
function asIdentifier(
	node: ESTree.Node,
): Extract<ESTree.Node, { type: "Identifier" }> | null {
	return node.type === "Identifier" ? node : null;
}

/**
 * Whether the declarator's initializer exempts it from the naming requirement.
 */
function isExemptInitializer(init: ESTree.Node | null): boolean {
	return init !== null && EXEMPT_INIT_TYPES.has(init.type);
}

/**
 * Whether a value is an array whose every element is a string.
 */
function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((item) => typeof item === "string")
	);
}

/**
 * Throws if `pattern` is not a valid regular expression source.
 */
function assertValidPattern(pattern: string): void {
	try {
		new RegExp(pattern);
	} catch (error) {
		throw new SyntaxError(
			`${RULE_ID}: invalid \`exceptionPatterns\` entry ${JSON.stringify(pattern)}: ${(error as Error).message}`,
		);
	}
}

/**
 * Parses the raw first config element into typed options.
 *
 * The plugin interface types options as arbitrary JSON, so the shape declared by `meta.schema` is not guaranteed at runtime.
 */
function parseOptions(raw: unknown): ModuleConstOptions {
	if (raw === undefined || raw === null) return {};

	if (typeof raw !== "object" || Array.isArray(raw))
		throw new TypeError(
			`${RULE_ID}: options must be an object, received ${Array.isArray(raw) ? "array" : typeof raw}.`,
		);

	const { exceptions, exceptionPatterns, ...rest } = raw as Record<
		string,
		unknown
	>;

	const unknownKeys = Object.keys(rest);

	if (unknownKeys.length > 0)
		throw new TypeError(
			`${RULE_ID}: unknown option(s): ${unknownKeys.join(", ")}.`,
		);

	if (exceptions !== undefined && !isStringArray(exceptions))
		throw new TypeError(
			`${RULE_ID}: \`exceptions\` must be an array of strings.`,
		);

	if (exceptionPatterns !== undefined && !isStringArray(exceptionPatterns))
		throw new TypeError(
			`${RULE_ID}: \`exceptionPatterns\` must be an array of strings.`,
		);

	for (const pattern of exceptionPatterns ?? []) assertValidPattern(pattern);

	return { exceptions, exceptionPatterns };
}

/**
 * Builds a predicate that reports whether a name is exempt by literal name or matching pattern.
 */
function makeIsExceptedName(
	options: ModuleConstOptions,
): (name: string) => boolean {
	const exceptions = new Set(options.exceptions ?? []);

	const patterns = (options.exceptionPatterns ?? []).map(
		(pattern) => new RegExp(pattern),
	);

	return function isExceptedName(name: string): boolean {
		return (
			exceptions.has(name) ||
			patterns.some((pattern) => pattern.test(name))
		);
	};
}

/**
 * Reports any module-level `const` identifier that is neither exempt nor `SCREAMING_SNAKE_CASE`.
 */
function checkStatement(
	context: Context,
	statement: ESTree.Node,
	isExceptedName: (name: string) => boolean,
): void {
	const declaration = asVariableDeclaration(unwrapExport(statement));

	if (declaration === null) return;
	if (declaration.kind !== "const") return;

	for (const declarator of declaration.declarations) {
		const id = asIdentifier(declarator.id);

		if (id === null) continue;
		if (isExemptInitializer(declarator.init)) continue;
		if (isExceptedName(id.name)) continue;
		if (SCREAMING_SNAKE.test(id.name)) continue;

		context.report({
			node: id,
			messageId: "notScreamingSnake",
			data: { name: id.name },
		});
	}
}

export default {
	meta: {
		type: "suggestion",
		docs: {
			description:
				"Require module-level `const` identifiers to be SCREAMING_SNAKE_CASE.",
			recommended: true,
		},
		messages: {
			notScreamingSnake:
				"Module-level constant `{{name}}` must be SCREAMING_SNAKE_CASE.",
		},
		schema: [
			{
				type: "object",
				properties: {
					exceptions: { type: "array", items: { type: "string" } },
					exceptionPatterns: {
						type: "array",
						items: { type: "string" },
					},
				},
				additionalProperties: false,
			},
		],
	},

	create(context: Context): Visitor {
		const options = parseOptions(context.options[0]);
		const isExceptedName = makeIsExceptedName(options);

		return {
			Program(node: ESTree.Program): void {
				for (const statement of node.body)
					checkStatement(context, statement, isExceptedName);
			},
		};
	},
} satisfies Rule;
