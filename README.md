# שבצ"ק (Shavtzak) - Military Shift Management System

**[מדריך התקנה בעברית](README.he.md)** - למי שרוצה להפעיל עותק עצמאי של המערכת

A modern web application for managing military shift schedules, soldier assignments, and unit organization. Built with React, TypeScript, and Supabase.

## Features

### Scheduling
- Interactive timeline view with 30-minute time slots
- Drag-and-drop shift assignment
- Overnight shift support (shifts spanning midnight)
- Visual indicators for shift conflicts and rest violations

### Soldier Management
- Comprehensive soldier profiles with personal details
- Role-based categorization (Officer, NCO, Soldier)
- Dynamic status tracking with customizable statuses
- Certificate/qualification system (Marksman, Medic, Driver, etc.)

### Organization Structure
- Platoon and squad management
- Certificate/qualification definitions
- Custom soldier status definitions
- Hierarchical unit organization

### Data Management
- Cloud-based storage with Supabase (PostgreSQL)
- CSV export/import functionality
- Real-time data synchronization

### Security
- Email/password authentication
- Row Level Security (RLS) policies
- Protected API access

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM
- **Date Handling**: date-fns
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the contents of `supabase/schema.sql`
3. Optionally run `supabase/seed.sql` to populate sample data
4. Get your project URL and anon key from Project Settings > API
5. Create a user account in Authentication > Users (for login)

### Installation

```bash
# Clone the repository
git clone https://github.com/liranfar/shavtzak.git
cd shavtzak

# Install dependencies
npm install

# Create .env file with your Supabase credentials
echo "VITE_SUPABASE_URL=your-supabase-url" > .env
echo "VITE_SUPABASE_ANON_KEY=your-anon-key" >> .env

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

## Deployment

The app is deployed on Vercel. To deploy your own instance:

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── layout/       # Layout components (Sidebar, Header)
│   ├── schedule/     # Scheduling-related components
│   └── ui/           # Generic UI components
├── lib/              # External service clients (Supabase)
├── pages/            # Page components
├── services/         # Business logic services
├── stores/           # Zustand state stores
├── types/            # TypeScript type definitions
└── utils/            # Utility functions and constants

supabase/
├── schema.sql        # Database schema
├── seed.sql          # Sample data
└── migrations/       # Database migrations
```

## Language

The application interface is in Hebrew (RTL layout).

## License

Private - All rights reserved
