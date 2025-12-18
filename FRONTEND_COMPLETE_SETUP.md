# RegNav.AI: Complete Frontend Setup Guide
## Modern React + TypeScript UI Framework

This guide will help you build the complete frontend skeleton with innovative navigation and end-to-end flow.

---

## 🎨 Design Philosophy

### Navigation Structure
- **Left Sidebar**: Persistent navigation with agent-based sections
- **Top Bar**: Context-sensitive actions, breadcrumbs, user menu
- **Main Content**: Dynamic based on current flow step
- **Right Panel**: Context help, AI assistant (collapsible)

### User Flow
```
1. Organization Selection (Profile Management)
   └─▶ Choose/Create insurer profile
   
2. Configuration Flow
   ├─▶ Line of Business selection
   ├─▶ State selection (multi-select)
   └─▶ Document preferences
   
3. Agent Workflows
   ├─▶ RegScout: Document Discovery
   ├─▶ RegIngest: Document Repository
   ├─▶ RuleMiner: Rule Management
   ├─▶ RuleSense: AI Insights
   └─▶ RegValidate: File Validation
   
4. Results & Analytics
   └─▶ Compliance Dashboard
```

---

## 🚀 Quick Setup (15 minutes)

### Step 1: Create React App

```bash
cd /Users/aditilakshminarayanan/Downloads/HCLTechProj./RegNav.AI

# Create React app with TypeScript
npx create-react-app frontend --template typescript
cd frontend

# Install dependencies
npm install react-router-dom @types/react-router-dom
npm install axios
npm install tailwindcss postcss autoprefixer
npm install @headlessui/react @heroicons/react
npm install recharts
npm install react-hot-toast
npm install zustand # State management
npm install clsx # Class name utilities

# Initialize Tailwind CSS
npx tailwindcss init -p
```

### Step 2: Configure Tailwind CSS

Replace `tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          900: '#0c4a6e',
        },
        success: {
          500: '#10b981',
          600: '#059669',
        },
        warning: {
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-in',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
```

### Step 3: Update src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md;
  }
  
  .btn-secondary {
    @apply bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 transition-colors duration-200;
  }
  
  .card {
    @apply bg-white rounded-lg shadow-sm border border-gray-200 p-6;
  }
  
  .input {
    @apply w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all;
  }
  
  .badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
  
  .badge-success {
    @apply bg-success-100 text-success-800;
  }
  
  .badge-warning {
    @apply bg-warning-100 text-warning-800;
  }
  
  .badge-danger {
    @apply bg-danger-100 text-danger-800;
  }
  
  .sidebar-link {
    @apply flex items-center px-4 py-3 text-gray-700 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors duration-150 cursor-pointer;
  }
  
  .sidebar-link-active {
    @apply bg-primary-100 text-primary-700 font-medium;
  }
}
```

---

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx          # Main layout wrapper
│   │   │   ├── Sidebar.tsx            # Left navigation
│   │   │   ├── TopBar.tsx             # Top context menu
│   │   │   └── Breadcrumb.tsx         # Breadcrumb navigation
│   │   ├── organization/
│   │   │   ├── OrganizationSelector.tsx
│   │   │   └── OrganizationForm.tsx
│   │   ├── configuration/
│   │   │   ├── LOBSelector.tsx
│   │   │   ├── StateSelector.tsx
│   │   │   └── USAMap.tsx
│   │   ├── regscout/
│   │   │   ├── DocumentDiscovery.tsx
│   │   │   └── SourceCard.tsx
│   │   ├── regingest/
│   │   │   ├── DocumentRepository.tsx
│   │   │   └── DocumentUpload.tsx
│   │   ├── ruleminer/
│   │   │   ├── RuleRepository.tsx
│   │   │   └── RuleCard.tsx
│   │   ├── rulesense/
│   │   │   ├── AIChat.tsx
│   │   │   └── InsightsPanel.tsx
│   │   ├── regvalidate/
│   │   │   ├── ValidationInterface.tsx
│   │   │   ├── ResultsTable.tsx
│   │   │   └── ComplianceScore.tsx
│   │   └── common/
│   │       ├── LoadingSpinner.tsx
│   │       ├── EmptyState.tsx
│   │       └── Modal.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── OrganizationPage.tsx
│   │   ├── ConfigurationPage.tsx
│   │   ├── RegScoutPage.tsx
│   │   ├── RegIngestPage.tsx
│   │   ├── RuleMinerPage.tsx
│   │   ├── RuleSensePage.tsx
│   │   └── RegValidatePage.tsx
│   ├── store/
│   │   └── appStore.ts               # Zustand store
│   ├── types/
│   │   └── index.ts                  # TypeScript types
│   ├── utils/
│   │   └── api.ts                    # API client
│   ├── data/
│   │   └── mockData.ts               # Mock data
│   ├── App.tsx
│   └── index.tsx
```

---

I'll now create all the files. This will be extensive, so I'll create the most important ones that demonstrate the complete flow.


