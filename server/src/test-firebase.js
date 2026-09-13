import dotenv from 'dotenv';
import { getFirestoreInstance, useMemoryStore } from './firebase.js';

dotenv.config();

console.log('🔍 Testing Firebase Firestore Database Connection...');

const db = getFirestoreInstance();

if (useMemoryStore) {
  console.log('\n❌ Real Firebase Database is NOT connected.');
  console.log('Currently using the fallback In-Memory mock store.');
  console.log('\n📋 To connect your real Firebase Firestore database:');
  console.log('  Option 1 (Recommended): Place `serviceAccountKey.json` directly into the `server/` directory.');
  console.log('  Option 2: Fill in the Firebase credentials in `server/.env`:');
  console.log('            FIREBASE_PROJECT_ID=...');
  console.log('            FIREBASE_CLIENT_EMAIL=...');
  console.log('            FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----"');
  process.exit(1);
}

async function runHealthCheck() {
  try {
    const testRef = db.collection('_healthcheck').doc('connection_test');
    const testData = {
      status: 'connected',
      checked_at: new Date().toISOString(),
      note: 'FocusGrid Firestore verification ping',
    };

    console.log('✍️  Writing test document to `_healthcheck` collection in Firestore...');
    await testRef.set(testData);

    console.log('📖 Reading test document back from Firestore...');
    const snapshot = await testRef.get();

    if (!snapshot.exists) {
      throw new Error('Test document write succeeded but could not be read back.');
    }

    const data = snapshot.data();
    console.log('✅ Document verified:', data);

    console.log('🧹 Cleaning up test document...');
    await testRef.delete();

    console.log('\n🎉 SUCCESS: Firebase Cloud Firestore is successfully connected and verified!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Firestore verification failed:', err.message);
    process.exit(1);
  }
}

runHealthCheck();
