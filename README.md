# שבצ"ק (Shavtzak) - Military Shift Management System

A modern web application for managing military shift schedules, soldier assignments, and unit organization. Built with React, TypeScript, and IndexedDB for offline-first functionality.

## Features

### Scheduling
- Interactive timeline view with 30-minute time slots
- Drag-and-drop shift assignment
- Overnight shift support (shifts spanning midnight)
- Visual indicators for shift conflicts and rest violations
- Fairness-based soldier suggestions for assignments

### Soldier Management
- Comprehensive soldier profiles with personal details
- Role-based categorization (Officer, NCO, Soldier)
- Status tracking (Available, Home, Task Locked, Sick)
- Certificate/qualification system (Marksman, Medic, Driver, etc.)
- Fairness score tracking for equitable shift distribution

### Organization Structure
- Platoon and squad management
- Certificate/qualification definitions
- Hierarchical unit organization

### Data Management
- Offline-first with IndexedDB (Dexie.js)
- Data export/import functionality
- Automatic database migrations

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **State Management**: Zustand
- **Database**: Dexie.js (IndexedDB wrapper)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Date Handling**: date-fns
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/liranfar/shavtzak.git
cd shavtzak

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── layout/       # Layout components (Sidebar, Header)
│   └── schedule/     # Scheduling-related components
├── db/               # Database configuration and utilities
├── pages/            # Page components
├── services/         # Business logic services
├── stores/           # Zustand state stores
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and constants
```

## Language

The application interface is in Hebrew (RTL layout).

## License

Private - All rights reserved
