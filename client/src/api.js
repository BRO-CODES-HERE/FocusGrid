import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
} from './firebase.js';

export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export async function apiFetch(endpoint, options = {}) {
  let token = localStorage.getItem('auth_token');

  if (auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
      localStorage.setItem('auth_token', token);
    } catch (e) {
      console.warn('Could not refresh Firebase ID token:', e);
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'API request failed');
  }
  return data;
}

export function initAuth() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        try {
          const token = await user.getIdToken();
          localStorage.setItem('auth_token', token);
        } catch (err) {
          console.warn('Could not get token on init:', err);
        }
        resolve({ user });
      } else {
        resolve({ user: null });
      }
    }, (error) => {
      console.error('Firebase Auth init error:', error);
      resolve({ user: null, error: error.message });
    });
  });
}

export async function signInWithEmail(...args) {
  // Support both (auth, email, password) and (email, password)
  const email = args.length >= 3 ? args[1] : args[0];
  const password = args.length >= 3 ? args[2] : args[1];

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('auth_token', token);
    return { data: { user: userCredential.user }, error: null };
  } catch (error) {
    console.error('Firebase signIn error:', error);
    let message = error.message;
    if (error.code === 'auth/operation-not-allowed') {
      message = 'Email/Password sign-in is not enabled in Firebase Console (Authentication -> Sign-in method).';
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      message = 'Invalid email or password.';
    }
    throw new Error(message);
  }
}

export async function signUpWithEmail(...args) {
  // Support both (auth, email, password) and (email, password)
  const email = args.length >= 3 ? args[1] : args[0];
  const password = args.length >= 3 ? args[2] : args[1];

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    localStorage.setItem('auth_token', token);
    return { data: { user: userCredential.user }, error: null };
  } catch (error) {
    console.error('Firebase signUp error:', error);
    let message = error.message;
    if (error.code === 'auth/operation-not-allowed') {
      message = 'Email/Password sign-in is not enabled in Firebase Console (Authentication -> Sign-in method).';
    } else if (error.code === 'auth/email-already-in-use') {
      message = 'An account with this email already exists. Try signing in.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password should be at least 6 characters.';
    }
    throw new Error(message);
  }
}

export async function signOut() {
  try {
    await fbSignOut(auth);
  } finally {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('supabase_token');
  }
}
