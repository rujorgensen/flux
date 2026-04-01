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

# Frameworks

## Elysia

### Returning Errors in Elysia

Elysia supports both built-in and custom errors with type safety.

#### Custom Errors
Elysia provides built-in error types like VALIDATION, NOT_FOUND, etc. If Elysia doesn't recognize the error, it defaults to UNKNOWN with a status of 500.

Define a Custom Error

```TypeScript
import { Elysia } from 'elysia'

class MyError extends Error {
    constructor(public message: string) {
        super(message)
    }
}

new Elysia()
    .error({
        MyError,
    })
    .onError(({ code, error }) => {
        switch (code) {
            case 'MyError':
                return error
        }
    })
    .get('/\:id', () => {
        throw new MyError('Hello Error')
    })
```

Custom Status Code

Add a status property to your custom error class:

```TypeScript
class MyError extends Error {
    status = 418

    constructor(public message: string) {
        super(message)
    }
}
```