# General Coding standards

## Angular Coding standard
- **Formatting:** Use Angular's [`decimal`](https://angular.io/api/common/DecimalPipe) pipe for numbers rather than manual formatting with `toFixed` etc.

## General Coding standards

### Function Formatting
```typescript
// ✅ Do
function example(
  arg1: string,
  arg2: number, // <-- trailing comma
) { ... }

// ❌ Avoid
function example(arg1: string, arg2: number) { ... }