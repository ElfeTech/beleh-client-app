import { initializeApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';

const FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

function loadFirebaseOptions(): FirebaseOptions {
  const env = import.meta.env;
  const missing: string[] = [];
  for (const key of FIREBASE_ENV_KEYS) {
    const value = env[key];
    if (typeof value !== 'string' || value.trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `[Firebase] Missing or empty environment variables: ${missing.join(', ')}. ` +
        'See frontend-client/.env.example and set all VITE_FIREBASE_* values.'
    );
  }
  return {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET as string,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
  };
}

const firebaseConfig = loadFirebaseOptions();
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting persistence:', error);
});

export function getGoogleProvider(): GoogleAuthProvider {
  return new GoogleAuthProvider();
}

/** Dev-only: warn when auth domain likely does not match the configured project (misconfigured OAuth / handler). */
function warnIfFirebaseEnvMisaligned(): void {
  if (!import.meta.env.DEV) return;
  const domain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
  if (!domain || !projectId) return;
  const normalized = domain.toLowerCase();
  const looksCustom =
    !normalized.endsWith('.firebaseapp.com') && !normalized.endsWith('.web.app');
  if (looksCustom) return;
  if (!normalized.includes(projectId.toLowerCase())) {
    console.warn(
      '[Firebase] VITE_FIREBASE_AUTH_DOMAIN does not include VITE_FIREBASE_PROJECT_ID. ' +
        'Confirm Firebase Console → Authentication → Authorized domains and Google Cloud OAuth redirect URIs match this project.',
      { domain, projectId }
    );
  }
}

warnIfFirebaseEnvMisaligned();
