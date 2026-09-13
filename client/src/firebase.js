import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAPZZnshfc5WPShmuLMKNTdCNeujTYq3ao",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "focusgrade-646ee.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "focusgrade-646ee",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "focusgrade-646ee.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "71581965180",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:71581965180:web:3a9d32ad389625e24e22f9"
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fbSignOut,
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
};
