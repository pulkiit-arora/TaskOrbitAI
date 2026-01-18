<div align="center">

# TaskOrbitAI

**A powerful, feature-rich task management application for habit tracking, recurring tasks, and personal productivity.**

[![Built with React](https://img.shields.io/badge/Built%20with-React-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## ✨ Key Features

### 🗓️ Multiple Calendar Views
| View | Description |
|------|-------------|
| **Today** | Focus on tasks due today with a clean, prioritized layout |
| **Week** | Plan your week at a glance with day-by-day columns |
| **Month** | Bird's eye view with grid/list toggle and overdue task panels |
| **Board** | Kanban-style workflow with columns for each status |
| **Analytics** | Track completion rates, priority distribution, and habits |

### 🔄 Advanced Recurrence System
- **Daily, Weekly, Monthly, Quarterly, Yearly** recurrence patterns
- **Custom intervals** — repeat every 2 weeks, every 3 months, etc.
- **Weekday selection** — "Every Mon, Wed, Fri"
- **Nth weekday of month** — "Last Saturday of every month"
- **Seasonal recurrence** — restrict tasks to specific months

### 🏷️ Tag-Based Organization
- Create **custom color-coded tags** for categorization
- Filter tasks by multiple tags across all views
- Manage tags from the centralized Tag Manager

### 📊 Analytics Dashboard
- **Completion rates** over customizable time ranges
- **Priority distribution** breakdown
- **Recurring Habits Panel** — track completion ratios for repeating tasks
- Click-to-drill-down into specific task categories

### ⚡ Power User Features
- **Command Palette** (`Ctrl/⌘ + K`) — Quick navigation, search, and actions
- **Drag-and-Drop** — Reschedule tasks by dragging across days or columns
- **Task Comments** — Add progress notes and updates to any task
- **Data Export/Import** — Backup and restore tasks via JSON

### 🎨 User Experience
- **Dark Mode** — Toggle from header or command palette
- **Smart Filtering** — Filter by status, priority, tags, and time scope
- **Onboarding Tour** — Guided introduction for new users
- **Auto-Save** — Data persists locally via IndexedDB

---

## 🚀 Quick Start

**Prerequisites:** Node.js

```bash
# 1. Install dependencies
npm install

# 2. Run the app
npm run dev
```

---

## 💡 Usage Tips

| Use Case | Recommended Feature |
|----------|---------------------|
| Build daily habits | Daily recurrence + Analytics habits panel |
| Manage bills/appointments | Monthly recurrence with specific day |
| Sprint planning | Week View + Board View + Tags |
| Stay focused today | Today View (default) |
| Power users | Command Palette (`Ctrl+K`) |
| Long-term projects | Comments for progress notes |

---

## 🛠️ Tech Stack

- **React** + **TypeScript**
- **Vite** for fast development
- **IndexedDB** for local persistence
- **Lucide Icons** for clean UI iconography

---

## 📄 License

MIT License — feel free to use and modify!
