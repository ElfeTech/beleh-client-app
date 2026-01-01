# Backend API Integration

This document explains how the frontend integrates with your backend API for authentication.

## Overview

The application uses a **dual authentication system**:
1. **Firebase Authentication**: Handles Google OAuth and provides secure ID tokens
2. **Backend API**: Registers/logs in users in your database using Firebase tokens

## Architecture

```
User clicks "Sign In/Sign Up"
         ↓
Firebase Google OAuth (popup)
         ↓
Firebase returns ID Token
         ↓
Store token in localStorage
         ↓
Call Backend API with token
         ↓
Backend validates token & creates/updates user
         ↓
Store backend user data
         ↓
Navigate to Workspace
```

## API Endpoints

### POST `/api/auth/register`

Registers a new user or updates an existing user.

**Request:**
```json
{
  "token": "firebase-id-token-here"
}
```

**Response (200):**
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "display_name": "John Doe",
  "photo_url": "https://...",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

### POST `/api/auth/login`

Logs in an existing user. Creates user if doesn't exist.

**Request:**
```json
{
  "token": "firebase-id-token-here"
}
```

**Response (200):**
```json
{
  "uid": "firebase-user-id",
  "email": "user@example.com",
  "display_name": "John Doe",
  "photo_url": "https://...",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

## Configuration

### Environment Variables

Add to your `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

For production:
```env
VITE_API_BASE_URL=https://your-backend-api.com
```

## Implementation Details

### Files Created

1. **[src/types/api.ts](src/types/api.ts)** - TypeScript types for API requests/responses
2. **[src/services/apiClient.ts](src/services/apiClient.ts)** - API client for backend communication
3. **Updated [src/services/authService.ts](src/services/authService.ts)** - Added backend integration

### Authentication Flow

#### Sign Up Flow

1. User clicks "Sign up with Google" on [SignUp page](src/pages/SignUp.tsx)
2. `registerWithGoogle()` is called in [AuthContext](src/context/AuthContext.tsx)
3. Firebase popup opens for Google authentication
4. After successful Firebase auth:
   - Firebase ID token is obtained
   - Token stored in localStorage (`firebase_auth_token`)
   - **Backend `/api/auth/register` is called** with the token
   - Backend user data stored in localStorage (`backend_user`)
5. User redirected to Workspace

#### Sign In Flow

1. User clicks "Continue with Google" on [SignIn page](src/pages/SignIn.tsx)
2. `signInWithGoogle()` is called in [AuthContext](src/context/AuthContext.tsx)
3. Firebase popup opens for Google authentication
4. After successful Firebase auth:
   - Firebase ID token is obtained
   - Token stored in localStorage (`firebase_auth_token`)
   - **Backend `/api/auth/login` is called** with the token
   - Backend user data stored in localStorage (`backend_user`)
5. User redirected to Workspace

### localStorage Keys

The application stores three items in localStorage:

1. **`firebase_auth_token`** - Firebase ID token (JWT)
   - Used for Firebase authentication
   - Auto-refreshed by Firebase
   - Sent to backend for validation

2. **`firebase_user`** - Firebase user data
   ```json
   {
     "uid": "...",
     "email": "...",
     "displayName": "...",
     "photoURL": "..."
   }
   ```

3. **`backend_user`** - Backend user data
   ```json
   {
     "uid": "...",
     "email": "...",
     "display_name": "...",
     "photo_url": "...",
     "created_at": "...",
     "updated_at": "..."
   }
   ```

### Error Handling

The integration includes graceful error handling:

```typescript
try {
  const backendUser = await apiClient.loginUser(token);
  this.storeBackendUser(backendUser);
} catch (backendError) {
  console.error('[Auth] Backend login failed:', backendError);
  // User can still proceed with Firebase auth
  // Backend sync will happen on next login
}
```

**Key points:**
- If backend API is unavailable, user can still authenticate with Firebase
- Backend errors are logged but don't block the login flow
- You can make backend required by throwing the error instead

## Backend Requirements

Your backend must:

1. **Validate Firebase ID tokens** using Firebase Admin SDK
2. **Extract user info** from the token (uid, email, name, photo)
3. **Create or update** user record in your database
4. **Return user data** in the specified format

### Example Backend (Python/FastAPI)

```python
from firebase_admin import auth, credentials
import firebase_admin

# Initialize Firebase Admin
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

@app.post("/api/auth/login")
async def login_user(user_data: UserCreate):
    try:
        # Verify Firebase token
        decoded_token = auth.verify_id_token(user_data.token)
        uid = decoded_token['uid']

        # Get user info from token
        email = decoded_token.get('email')
        name = decoded_token.get('name')
        picture = decoded_token.get('picture')

        # Create or update user in database
        user = await db.upsert_user(
            uid=uid,
            email=email,
            display_name=name,
            photo_url=picture
        )

        return user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
```

## Testing

### 1. Start Your Backend

```bash
# Make sure your backend is running
# Default: http://localhost:8000
```

### 2. Configure Frontend

```bash
# Create .env file
cp .env.example .env

# Edit .env and set:
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Start Frontend

```bash
npm run dev
```

### 4. Test Authentication

1. Navigate to http://localhost:5173
2. Click "Sign up" or "Sign in"
3. Complete Google OAuth
4. Check console for backend API calls:
   - `[API] POST /api/auth/register` or `/api/auth/login`
   - `[Auth] Backend login successful`
5. Check localStorage for `backend_user` data

## Debugging

### Enable Detailed Logging

All API calls are logged with `[API]` prefix:

```
[API] POST http://localhost:8000/api/auth/login
[API] Success response: { uid: "...", email: "..." }
```

Auth service logs with `[Auth]` prefix:

```
[Auth] Opening Google sign-in popup...
[Auth] Sign-in successful, user: user@example.com
[Auth] Token obtained, storing in localStorage...
[Auth] Calling backend login API...
[Auth] Backend login successful, user registered in database
```

### Common Issues

**Backend API not called:**
- Check `VITE_API_BASE_URL` in `.env`
- Restart dev server after changing `.env`
- Check browser console for CORS errors

**401 Unauthorized from backend:**
- Backend is not validating Firebase token correctly
- Check Firebase Admin SDK is initialized
- Verify token is being sent correctly

**Network errors:**
- Backend not running
- Wrong URL in `VITE_API_BASE_URL`
- CORS not configured on backend

## Security Considerations

1. **ID Token Validation**: Backend MUST validate Firebase tokens using Firebase Admin SDK
2. **HTTPS in Production**: Use HTTPS for both frontend and backend
3. **Token Expiry**: Firebase tokens expire after 1 hour - handled automatically by Firebase
4. **CORS**: Backend must allow requests from your frontend domain
5. **Rate Limiting**: Implement rate limiting on auth endpoints

## Next Steps

- [ ] Set up your backend API with the required endpoints
- [ ] Configure Firebase Admin SDK in backend
- [ ] Add CORS configuration for your frontend domain
- [ ] Test the complete authentication flow
- [ ] Deploy backend and update `VITE_API_BASE_URL` for production
