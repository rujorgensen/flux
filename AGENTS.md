<!-- general start-->

# General Rules for LLM Agents

## Runtime
Always prefer bun for running scripts, installing dependencies, or executing any Node.js-related tasks in this repository. Use bun run <script> instead of npm run, yarn, or npx.

<!-- general end-->

<!-- style guide start-->
## CSS
Do **not** use BEM syntax. This project uses Sass, and nesting is sufficient.

<!-- style guide end-->

<!-- testing start-->
## Testing
Test files uses the `.spec.ts` extention. The tooling can be different according to the domain:

- Shared: Use `bun test` if possible, otherwise fallback on Vitest
- Frontend (Angular): Angular recently started supporting Vitest. First attempt to use Vitest, or fallback on Jest.
- Backend: Use `bun test` if possible, otherwise fallback on Vitest

<!-- testing end-->

<!-- coding style start-->
## Coding Style Guide

### Naming Conventions
- Use "at" for dates; use `updatedAt: Date` rather than `updateDate: Date`

### Function Formatting
```typescript
// ✅ Do
function example(
  arg1: string,
  arg2: number, // <-- trailing comma
) { ... }

// ❌ Avoid
function example(arg1: string, arg2: number) { ... }
```

## Data Access
Adopt a service → repository pattern for data access.

For example, for a feature's database interactions:

- Use feature-name.repository.ts for direct data store (eg database or redis) operations.
- Use feature-name.service.ts as an intermediary layer.

Consumers should interact only with the service class.

## Database Access
Always use Prisma models instead of raw SQL or direct `client.query(...)` calls.

<!-- coding style end-->

<!-- pr workflow start-->
# PR Workflow

## Fallow Report Generation
Always run the following command at the end of every PR to generate a fallow dead-code report:

```bash
bun run fallow:report
```
Notes:
- The report will be saved as code-report.md in the repo root.
- The command is defined in package.json and uses bunx fallow dead-code --format markdown.
- Ignore errors (the || true in the script ensures the process continues even if the command fails).

## Formatting Workflow
- Do not mass-reformat unrelated files when addressing PR comments.
- Don't fix formatting in existing files you are applying logic changes to, unless explicitly asked to.
- Make sure any added code is peroperly formatted.

## Linting
Always run oxlint when finishing a task to make sure everything is in order:

```bash
bunx --bun oxlint --quiet
```
Empty output means the code is clean. Fix any reported issues before considering the task done.

## Bump version
Bump the version of packages if relevant, by running the convenience script:

```bash
bun run bump
```
<!-- pr workflow end-->

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

<!-- Angular configuration start-->

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

# Dependency Injection:

Always use constructor injection for Angular dependencies. Avoid inject() unless absolutely necessary (e.g., in factories or standalone contexts). Constructor injection is more explicit and testable.

Example:

```TypeScript
// ✅ Preferred
constructor(
    private readonly _myService: MyService,
) {}

// ❌ Avoid
private service = inject(MyService);
```

## TypeScript Best Practices

- Use strict type checking
- Don't prefer type inference even when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

<!-- Angular configuration end-->


<!-- Generated Files Warning start -->
## Generated Files

Some folders contain auto-generated outputs and should be treated as read-only.

Therefore:
- NEVER edit files in generated folders like `@prisma-types`, `node_modules`, or `dist`.
- NEVER edit files in backup folders like `_backup`.

Any changes to these folders will be overwritten during the next build or generation process.

<!-- Generated Files Warning end -->
