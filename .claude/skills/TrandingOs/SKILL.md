```markdown
# TrandingOs Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the TrandingOs TypeScript codebase. You'll learn about file organization, import/export styles, commit patterns, and how to write and run tests. While no formal workflows or frameworks are detected, this guide will help you contribute code that matches the project's established style.

## Coding Conventions

### File Naming
- **Convention:** PascalCase for all files.
- **Example:**  
  ```
  UserProfile.ts
  OrderManager.ts
  ```

### Import Style
- **Convention:** Use relative imports for all modules.
- **Example:**
  ```typescript
  import { User } from './User';
  import { OrderManager } from '../managers/OrderManager';
  ```

### Export Style
- **Convention:** Use named exports.
- **Example:**
  ```typescript
  // In User.ts
  export interface User {
    id: string;
    name: string;
  }

  // In OrderManager.ts
  export function createOrder(user: User) { ... }
  ```

### Commit Patterns
- **Type:** Freeform, no enforced prefixes.
- **Average length:** ~38 characters.
- **Example:**
  ```
  Fix bug in order calculation logic
  Add support for user profile updates
  ```

## Workflows

_No formal workflows detected in this repository. If you wish to standardize common tasks, see the suggested commands below._

## Testing Patterns

- **Framework:** Unknown (not detected).
- **Test File Pattern:** Files matching `*.test.*` are used for tests.
- **Example:**
  ```
  User.test.ts
  OrderManager.test.ts
  ```
- **Typical Test Structure:**  
  (Assuming a common TypeScript testing style)
  ```typescript
  import { createOrder } from './OrderManager';

  test('should create order for valid user', () => {
    // test implementation
  });
  ```

## Commands

| Command         | Purpose                                    |
|-----------------|--------------------------------------------|
| /new-file       | Create a new PascalCase TypeScript file    |
| /add-test       | Add a new test file with *.test.* pattern  |
| /list-tests     | List all test files in the project         |
| /run-tests      | Run all test files (framework dependent)   |
| /commit         | Make a commit using freeform message style |

```