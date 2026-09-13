import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAPZZnshfc5WPShmuLMKNTdCNeujTYq3ao",
  authDomain: "focusgrade-646ee.firebaseapp.com",
  projectId: "focusgrade-646ee",
  storageBucket: "focusgrade-646ee.firebasestorage.app",
  messagingSenderId: "71581965180",
  appId: "1:71581965180:web:3a9d32ad389625e24e22f9"
};

console.log('🔍 Testing Cloud Firestore connection for project: focusgrade-646ee...\n');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 6 second timeout to catch NOT_FOUND retry loops
const timer = setTimeout(() => {
  console.log('\n❌ Connection Status: Cloud Firestore database has NOT been created yet in project "focusgrade-646ee".');
  console.log('   (Firebase returned error: 5 NOT_FOUND - the database does not exist)\n');
  console.log('👉 Quick 30-Second Fix in Firebase Console:');
  console.log('   1. Open: https://console.firebase.google.com/project/focusgrade-646ee/firestore');
  console.log('   2. Click the "Create database" button.');
  console.log('   3. Choose "Start in test mode" (allows read & write) and click Next.');
  console.log('   4. Choose your Cloud Firestore location (e.g. us-central1 or asia-south1) and click Enable.');
  console.log('\nOnce created, run this test again and it will connect instantly!');
  process.exit(1);
}, 6000);

async function testConnection() {
  try {
    const testDocRef = doc(db, '_connection_test', 'ping');
    await setDoc(testDocRef, {
      status: 'connected',
      tested_at: new Date().toISOString(),
      app: 'FocusGrid'
    });

    const snap = await getDoc(testDocRef);
    clearTimeout(timer);

    if (snap.exists()) {
      console.log('🎉 SUCCESS: Cloud Firestore database is CREATED, CONNECTED, and WORKING!');
      console.log('Verified write & read payload:', snap.data());
      process.exit(0);
    }
  } catch (error) {
    clearTimeout(timer);
    if (error.code === 'permission-denied') {
      console.log('⚠️ Database is created, but Security Rules are blocking access.');
      console.log('👉 To fix: In Firebase Console -> Firestore Database -> Rules, set:');
      console.log('   rules_version = \'2\';\n   service cloud.firestore {\n     match /databases/{database}/documents {\n       match /{document=**} { allow read, write: if true; }\n     }\n   }');
    } else {
      console.error('❌ Firestore Error:', error.message);
    }
    process.exit(1);
  }
}

testConnection();
