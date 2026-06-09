# `oxlint-frontier-style`

This is an [oxlint](https://oxc.rs/docs/guide/usage/linter.html) plugin which enforces the code in the Frontier code style.

## Rules

Some conventions are cooler than the rules they run against. Rule escape hatches exist for a reason. Use `oxlint-ignore` where appropriate.

### Module-level JSDoc required

Each module-level entity must carry a JSDoc describing what it is and why it exists.

### File JSDoc required

Each file must start with a JSDoc block with a `@file` declaration describing what that file does and why it exists.

### Preferred declaration order

All declarations must follow the following order:

1. `@file` JSDoc (see above)
2. imports
3. types
4. interfaces
5. constants
6. functions
7. file exports (the final `export {}`/`export default XYZ` block)

This order apparently makes natural sense to some developers.

### `SCREAMING_SNAKE_CASE` for module-level constants

All module-level constants must be spelled in `SCREAMING_SNAKE_CASE`.

_Configurable_:

- `exceptions` match against literal names (e.g. `logger`, `formatter`, `rule`)
- `exceptionPatterns` match against RegEx patterns (e.g. `__.*` to except names like `__unused`)

### Exported entities after unexported ones

Exported entities carry a heavier semantic weight (they're meant to be relied upon by consumers). This means they should be closer to the bottom within their category.

### Block types must be separate

Declarations of the same type (function calls, constants etc.) may be grouped together. Declarations of different types must be separated by an empty line.

## Should I Use It?

No.

Unless you're of a particular aesthetic preference or are working on a specific set of packages, you don't need it. This is shared config for a narrow set of projects.

## License

MIT
