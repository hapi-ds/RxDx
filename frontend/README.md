# RxDx Frontend

Project Management System for Regulated Industries - Frontend Application

## Technology Stack

- **React**: 18+
- **TypeScript**: 5.9+
- **Build Tool**: Vite
- **State Management**: Zustand
- **2D Graph Visualization**: @xyflow/react (react-flow)
- **3D/VR Visualization**: React Three Fiber (R3F) with WebXR
- **HTTP Client**: Axios
- **Testing**: Vitest + React Testing Library

## Setup

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment configuration:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your configuration

### Running the Application

Development server with hot reload:
```bash
npm run dev
```

The application will be available at http://localhost:5173

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

## Development

### Running Tests

Run tests in watch mode:
```bash
npm test
```

Run tests once:
```bash
npm run test:run
```

Run tests with UI:
```bash
npm run test:ui
```

### Code Quality

Lint code:
```bash
npm run lint
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # Reusable React components
│   ├── pages/               # Page components
│   ├── stores/              # Zustand state stores
│   │   └── authStore.ts     # Authentication store
│   ├── services/            # API clients
│   │   └── api.ts           # Axios API client
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts         # Common types
│   ├── hooks/               # Custom React hooks
│   ├── utils/               # Utility functions
│   ├── test/                # Test setup
│   ├── App.tsx              # Main application component
│   ├── App.test.tsx         # App tests
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
├── .env.example             # Environment template
├── .env.local               # Local environment (gitignored)
├── vite.config.ts           # Vite configuration
├── vitest.config.ts         # Vitest configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## Features

### State Management

The application uses Zustand for state management. Example stores:

- `authStore`: Authentication state and actions
- More stores will be added as features are implemented

### API Client

The API client (`src/services/api.ts`) provides:
- Automatic JWT token injection
- Request/response interceptors
- Error handling
- TypeScript support

### Testing

Tests are written using Vitest and React Testing Library:
- Unit tests for components
- Integration tests for user flows
- Property-based tests (when applicable)

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `VITE_API_BASE_URL`: Backend API URL (default: http://localhost:8000)
- `VITE_APP_NAME`: Application name
- `VITE_APP_VERSION`: Application version

## Browser Support

- Modern browsers with ES2020+ support
- WebXR-capable browsers for VR features (Chrome, Edge, Firefox)
- Meta Quest Browser for VR headset support

## License

Proprietary - All rights reserved
