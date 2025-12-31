# Testing Guide

This project uses [Vitest](https://vitest.dev/) for unit testing.

## Running Tests

To run the automated test suite:

```bash
npm test
```

To run tests once (without watch mode):

```bash
npm run test:run
```

## Test Coverage

### Core Logic (`utils/taskUtils.ts`)
- **Next Due Date Calculation**: Verified for Daily, Weekly, Monthly, and Yearly recurrences.
- **Month Overflow Protection**: Ensures dates like Jan 31st don't skip months (e.g., correctly lands on Feb 28/29).
- **Specific Day Rules**: Validates that "Monthly on Day 5" stays on Day 5.
- **Sorting**: Verifies tasks are sorted correctly by Priority and Due Date.

### Storage (`services/storage.ts`)
- **Persistence**: functionality to save and load tasks from LocalStorage.
- **Error Handling**: Graceful recovery from corrupted data.

### Task Logic (`utils/taskLogic.ts`)
- **Completion Flows**: Verifies that completing a recurring task generates the next TODO task with correct due dates.
- **Un-completion**: verifies that un-completing a task cleans up auto-generated future duplicates.
- **View Agnostic**: Confirms logic works independently of the UI view (Board, Week, Month).

## Writing New Tests

Add new test files in the `__tests__` directory with the extension `.test.ts`.
Example:

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('does something properly', () => {
    expect(true).toBe(true);
  });
});
```
