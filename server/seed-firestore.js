/**
 * Seed script: creates the four collections FocusGrid needs in Firestore
 * with one starter document each, so the collections exist in the Console
 * and composite indexes can finish building.
 *
 * ── Prerequisites (choose ONE): ─────────────────────────────────────────
 *  Option A (recommended): put `serviceAccountKey.json` in the `server/` dir
 *  Option B: fill these in `server/.env`:
 *      FIREBASE_PROJECT_ID=focusgrade-646ee
 *      FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@focusgrade-646ee.iam.gserviceaccount.com
 *      FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
 *
 * ── Run: ────────────────────────────────────────────────────────────────
 *   cd server && node seed-firestore.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

function loadCredentials() {
  const candidates = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.resolve(__dirname, 'serviceAccountKey.json'),
    path.resolve(__dirname, '..', 'serviceAccountKey.json'),
  ].filter(Boolean);

  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (data.project_id && data.private_key) return data;
    }
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY &&
      !FIREBASE_PRIVATE_KEY.includes('your_firebase')) {
    return {
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }
  return null;
}

const credentials = loadCredentials();
if (!credentials) {
  console.error('❌ No Firebase Admin credentials found.');
  console.error('   Put `serviceAccountKey.json` in `server/` (download it from');
  console.error('   Firebase Console → Project settings → Service accounts → Generate new private key)');
  console.error('   or fill FIREBASE_* variables in `server/.env`.');
  process.exit(1);
}

const apps = getApps();
if (apps.length === 0) initializeApp({ credential: cert(credentials) });
const db = getFirestore();

const SERVER_TIMESTAMP = () => new Date();

async function seed() {
  console.log(`🌱 Seeding Firestore for project: ${credentials.project_id || 'focusgrade-646ee'}\n`);

  // 1) _healthcheck — connection test doc (matches server/src/test-firebase.js)
  await db.collection('_healthcheck').doc('connection_test').set({
    status: 'initialized',
    app: 'FocusGrid',
    created_at: SERVER_TIMESTAMP(),
  });
  console.log('✅ _healthcheck/connection_test');

  // 2) users — placeholder profile. Delete after your first real signup,
  //    or keep as a reference template for the user document shape.
  await db.collection('users').doc('_template_user').set({
    username: 'TEMPLATE (safe to delete)',
    level: 1,
    total_xp: 0,
    gold: 50,
    current_streak: 0,
    last_active_date: new Date().toISOString(),
    stats: { intellect: 0, strength: 0, agility: 0, wisdom: 0 },
    created_at: SERVER_TIMESTAMP(),
  });
  console.log('✅ users/_template_user');

  // 3) tasks — one sample task, safe to delete
  await db.collection('tasks').doc('_template_task').set({
    user_id: '_template_user',
    title: 'Sample: Finish project report',
    description: 'Template task to create the collection. Safe to delete.',
    attribute: 'intellect',
    xp_reward: 25,
    gold_reward: 10,
    completed: false,
    completed_at: null,
    created_at: SERVER_TIMESTAMP(),
  });
  console.log('✅ tasks/_template_task');

  // 4) inventory — one sample item, safe to delete
  await db.collection('inventory').doc('_template_item').set({
    user_id: '_template_user',
    item_name: 'Streak Shield',
    cost: 200,
    purchased_at: SERVER_TIMESTAMP(),
  });
  console.log('✅ inventory/_template_item');

  console.log('\n🎉 Done. Collections created: users, tasks, inventory, _healthcheck');
  console.log('   The _template_* docs are safe to delete from the Firebase Console.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message);
  if (err.code === 5 || /NOT_FOUND/i.test(err.message)) {
    console.error('   The Firestore database itself does not exist yet.');
    console.error('   Create it first: https://console.firebase.google.com/project/focusgrade-646ee/firestore');
  }
  process.exit(1);
});
