# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the application.

## Prerequisites

- A Google account
- Node.js and npm installed

## Setup Steps

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard to create your project

### 2. Enable Google Authentication

1. In the Firebase Console, navigate to **Authentication** > **Sign-in method**
2. Click on **Google** in the providers list
3. Toggle the **Enable** switch
4. Add your project support email
5. Click **Save**

### 3. Register Your Web App

1. In the Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`)
4. Register your app with a nickname (e.g., "Beleh Frontend")
5. Copy the Firebase configuration object

### 4. Configure Environment Variables

1. Create a `.env` file in the project root:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

### 5. Add Authorized Domains

1. In Firebase Console, go to **Authentication** > **Settings** > **Authorized domains**
2. Add your development domain (usually `localhost` is already authorized)
3. For production, add your production domain

## Authentication Features

### Implemented Features

- **Google Sign-In**: Users can sign in using their Google account
- **Protected Routes**: Workspace is protected and requires authentication
- **Token Storage**: Firebase authentication tokens are stored in localStorage
- **Auto Token Refresh**: Tokens are automatically refreshed when needed
- **Persistent Sessions**: Users stay logged in across browser sessions
- **Sign Out**: Users can sign out and tokens are cleared

### Authentication Flow

1. User visits the app
2. If not authenticated, redirected to Sign In page
3. User clicks "Continue with Google"
4. Google authentication popup appears
5. After successful authentication:
   - User data is stored in localStorage
   - Auth token is stored in localStorage
   - User is redirected to Workspace
6. On subsequent visits, authentication state is restored from localStorage

### Token Management

The authentication service ([src/services/authService.ts](src/services/authService.ts)) handles:

- **Token Storage**: Tokens are stored in localStorage with key `firebase_auth_token`
- **User Data Storage**: User profile data stored with key `firebase_user`
- **Token Retrieval**: `getAuthToken()` method to get current token
- **Token Refresh**: `refreshToken()` method to refresh expired tokens
- **Token Cleanup**: Tokens are cleared on sign out

### Using Authentication in Your App

#### Get Current User

```typescript
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user } = useAuth();

  return <div>Hello, {user?.displayName}</div>;
}
```

#### Get Auth Token for API Calls

```typescript
import { authService } from './services/authService';

async function callAPI() {
  const token = authService.getAuthToken();

  const response = await fetch('your-api-endpoint', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
}
```

#### Protect a Route

```typescript
import { ProtectedRoute } from './components/ProtectedRoute';

<Route
  path="/protected"
  element={
    <ProtectedRoute>
      <YourComponent />
    </ProtectedRoute>
  }
/>
```

## Development

Run the development server:

```bash
npm run dev
```

## Security Notes

- Never commit your `.env` file to version control
- The `.env.example` file contains placeholder values only
- Auth tokens are stored in localStorage (consider httpOnly cookies for enhanced security in production)
- Firebase automatically handles token refresh before expiration

## Troubleshooting

### "Firebase configuration not found"
- Check that your `.env` file exists and contains all required variables
- Restart the development server after creating/updating `.env`

### "Unauthorized domain"
- Add your domain to Firebase Console > Authentication > Authorized domains

### "Cross-Origin-Opener-Policy policy would block the window.closed call"
- This is a console warning that doesn't break functionality
- Fixed by adding proper COOP headers in vite.config.ts
- The dev server now allows popup-based authentication
- No action needed from your side

## Additional Resources

- [Firebase Authentication Documentation](https://firebase.google.com/docs/auth)
- [Firebase Web Setup Guide](https://firebase.google.com/docs/web/setup)
- [Google Sign-In Guide](https://firebase.google.com/docs/auth/web/google-signin)
