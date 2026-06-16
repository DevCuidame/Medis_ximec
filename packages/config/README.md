# Shared Configuration

Centralized configuration for ESLint, TypeScript, and Prettier across all applications.

## Usage

Each package or app should reference these configurations:

### ESLint

Extend from this package's ESLint config:

```json
{
  "extends": ["@medisxime/config/eslint"]
}
```

### TypeScript

Extend from the base TypeScript config:

```json
{
  "extends": "@medisxime/config/tsconfig"
}
```

### Prettier

Use the shared Prettier config:

```json
{
  "prettier": "@medisxime/config/prettier"
}
```

## Benefits

- 🎯 Single source of truth for code style
- 🔄 Easier updates across all packages
- ✨ Consistent developer experience
