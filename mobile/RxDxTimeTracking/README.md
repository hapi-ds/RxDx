# RxDx Time Tracking Mobile App

A React Native mobile application for iOS and Android that enables time tracking for the RxDx project management system.

## Project Information

- **App Name**: RxDx Time Tracking
- **Version**: 1.0.0
- **Bundle Identifier (iOS)**: com.rxdx.timetracking
- **Package Name (Android)**: com.rxdx.timetracking
- **Minimum iOS Version**: 13.0
- **Minimum Android SDK**: 26 (Android 8.0)

## Phase 1 Setup Complete

### 1.1 Project Initialization ✅
- React Native project initialized with TypeScript template
- TypeScript configured with strict mode enabled
- ESLint and Prettier configured for code quality
- .gitignore configured for React Native projects
- Project directory structure created:
  - `src/screens` - Screen components
  - `src/components` - Reusable UI components
  - `src/services` - API and business logic services
  - `src/contexts` - React Context providers
  - `src/types` - TypeScript type definitions
  - `src/utils` - Utility functions
  - `src/navigation` - Navigation configuration
- Package.json scripts configured for common tasks

### 1.2 Core Dependencies Installed ✅
- **React Navigation**: `@react-navigation/native`, `@react-navigation/stack`, `@react-navigation/bottom-tabs`
- **React Navigation Dependencies**: `react-native-screens`, `react-native-safe-area-context`
- **Storage**: `@react-native-async-storage/async-storage`
- **HTTP Client**: `axios`
- **Date Utilities**: `date-fns`
- **UI Components**: `react-native-paper`, `react-native-vector-icons`
- **Notifications**: `@notifee/react-native`

### 1.3 Build Configuration ✅
- iOS build settings configured (bundle identifier, deployment target)
- Android build settings configured (package name, minSdkVersion 26)
- App icons and splash screen set up
- App display name and version configured

## Available Scripts

- `npm start` - Start Metro bundler
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device (macOS only)
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Run ESLint and auto-fix issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- React Native development environment
- **For iOS**: macOS with Xcode 14+ and CocoaPods
- **For Android**: Android Studio and JDK 11+

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. For iOS (macOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

3. Start Metro bundler:
   ```bash
   npm start
   ```

4. Run on Android:
   ```bash
   npm run android
   ```

5. Run on iOS (macOS only):
   ```bash
   npm run ios
   ```

## Project Structure

```
RxDxTimeTracking/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React Context providers
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # Screen components
│   ├── services/         # API and business logic
│   ├── types/            # TypeScript types
│   └── utils/            # Utility functions
├── __tests__/            # Test files
├── App.tsx               # Root component
├── index.js              # Entry point
└── package.json          # Dependencies and scripts
```

## Next Steps

Phase 2 will implement:
- Core services (Storage, API, Auth, Time Tracking)
- Utility functions
- Type definitions
- State management with React Context
- UI components
- Screens and navigation

## Backend API

The mobile app connects to the RxDx backend API. Ensure the backend is running and accessible before testing the mobile app.

Default API URL: `http://localhost:8000/api/v1`

## License

This project is part of the RxDx project management system.
