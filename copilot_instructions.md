# TaskOrbit AI - Copilot Instructions & Developer Guide

This document defines the coding standards, architectural patterns, and business logic unique to **TaskOrbit AI**. Use this context when generating or modifying code.

## 1. Tech Stack
- **Framework**: React 18 (TypeScript) with Vite.
- **Styling**: Tailwind CSS (loaded via CDN/Script in `index.html`, but classes used in components).
- **Icons**: `lucide-react`.
- **State/Storage**: Custom `useTasks` hook backed by **IndexedDB** (`idb`). No external backend.
- **Routing**: Single Page Application (SPA) with conditional rendering (No Router).

## 2. Core Domain Logic: Recurrence
The recurrence system is the most complex part of the app. It does **not** generate database records for future events. Instead, it projects "Virtual Tasks" on the fly.

### A. The "Virtual Task" Pattern
- **Base Task**: The record stored in DB. Contains `recurrence: DAILY|WEEKLY...`, `recurrenceInterval`, etc.
- **Virtual Task**: Calculated at runtime (in `MonthView`, `WeekView`).
- **ID Format**: Virtual tasks have IDs in the format:
  ```
  {baseTaskId}-virtual-{occurrenceTimestamp}
  ```
  *Example*: `abc-123-virtual-1704067200000`

### B. Handling Exceptions (Edits)
When a user edits a specific occurrence of a recurring series (e.g., changes the status of "Jan 15th" instance):
1. **Detach**: The system creates a **new, separate Task** record (Recurrence: NONE).
2. **Flag**: The new task gets `isRecurringException: true`.
3. **Exclude**: The original Base Task gets the *original date* added to its `excludedDates` array.
   - This prevents the "Virtual Task" from showing up alongside the new "Exception Task".

### C. Deletion Logic
- **Delete Single Occurrence**: Add the occurrence date to `baseTask.excludedDates`.
- **Delete Series**: Delete the `baseTask` record entirely.

### D. "Today" Visibility Rule
- **Rule**: If a recurring task is due "Today" (based on `dueDate`), it MUST be shown, even if the recurrence rule (e.g., "Monthly on 15th") calculates that today isn't a match.
- **Logic**: `doesTaskOccurOnDate` checks `task.dueDate` equality explicitly.

## 3. Component Architecture
- **Views**: `BoardView` (Kanban), `MonthView` (Calendar), `WeekView` (Calendar).
- **Modals**: `TaskModal` handles Create/Edit. `DeleteConfirmationModal` handles Single vs Series deletion.
- **State**: `App.tsx` holds the "Single Source of Truth" `tasks` state and handlers (`handleSaveTask`, `handleDeleteTask`).

## 4. Common Gotchas
- **Do not clone on Edit**: When editing the Base Task itself, update it directly. Do not create a copy.
- **Drag & Drop**: In Calendar views, dragging a task changes its `dueDate`.
- **Dark Mode**: Use `dark:` variant classes. Toggle is in `App.tsx`.
- **IndexedDB**: Data is distinct per browser profile. "Export/Import" JSON is the only backup method.

## 5. Style Guidelines
- **Tailwind**: Use utility classes for everything.
- **Colors**:
  - `Priority.HIGH`: Red
  - `Priority.MEDIUM`: Yellow
  - `Priority.LOW`: Blue
- **Icons**: `lucide-react` (e.g., `RefreshCw` for recurrence, `Minus` broken chain for exceptions).
