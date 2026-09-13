import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firestoreInstance = null;
let useMemoryStore = false;

// ── In-memory store that mimics Firestore API (for demo without real Firebase) ──
function getMemoryFirestore() {
  const store = {
    collections: {},
    _nextId: 0,

    _nextDocId() {
      return `doc_${Date.now()}_${this._nextId++}_${Math.random().toString(36).slice(2, 8)}`;
    },

    collection(name) {
      if (!store.collections[name]) store.collections[name] = {};

      // Query builder: supports chained .where()
      function makeQueryBuilder(filters = []) {
        const qb = {
          where(field, op, value) {
            filters.push({ field, op, value });
            return qb; // chainable
          },
          get() {
            return Promise.resolve({
              docs: Object.entries(store.collections[name] || {})
                .filter(([, doc]) => doc._exists)
                .filter(([, doc]) => {
                  return filters.every(f => {
                    if (f.op === '==' && f.field in doc._data) {
                      return doc._data[f.field] === f.value;
                    }
                    return true;
                  });
                })
                .map(([id, doc]) => ({
                  id,
                  data() { return { ...doc._data }; },
                  exists: true,
                })),
            });
          },
        };
        return qb;
      }

      return {
        doc(id) {
          // Firestore auto-generates IDs when doc() is called with no argument
          const docId = id || store._nextDocId();
          if (!store.collections[name][docId]) {
            store.collections[name][docId] = { _id: docId, _data: null, _exists: false };
          }

          const docRef = {
            path: `${name}/${docId}`,
            id: docId,
            _collection: name,
          };

          return {
            ...docRef,
            get() {
              const doc = store.collections[name][docId];
              return Promise.resolve({
                exists: doc._exists,
                data() { return doc._data ? { ...doc._data } : null; },
                id: docId,
              });
            },
            set(data, options) {
              const doc = store.collections[name][docId];
              doc._data = { ...data };
              doc._exists = true;
              return Promise.resolve();
            },
            update(data) {
              const doc = store.collections[name][docId];
              if (doc._data) {
                doc._data = { ...doc._data, ...data };
              }
              return Promise.resolve();
            },
            delete() {
              const doc = store.collections[name][docId];
              doc._data = null;
              doc._exists = false;
              return Promise.resolve();
            },
          };
        },
        // .where() returns a query builder
        where(field, op, value) {
          return makeQueryBuilder([{ field, op, value }]);
        },
      };
    },

    runTransaction(fn) {
      // Create document references that the transaction callbacks expect
      function makeDocRef(collectionName, docId) {
        return {
          path: `${collectionName}/${docId}`,
          id: docId,
          _collection: collectionName,
        };
      }

      const tx = {
        collection(name) { return store.collection(name); },
        doc(id) { return makeDocRef('__default__', id); },
        update(ref, data) {
          const pathParts = ref.path.split('/');
          const coll = pathParts[0];
          const docId = pathParts[1];
          const doc = store.collections[coll]?.[docId];
          if (doc && doc._exists) {
            doc._data = { ...(doc._data || {}), ...data };
          }
          return Promise.resolve();
        },
        set(ref, data, options) {
          const pathParts = ref.path.split('/');
          const coll = pathParts[0];
          const docId = pathParts[1];
          if (!store.collections[coll]) store.collections[coll] = {};
          store.collections[coll][docId] = { _id: docId, _data: { ...data }, _exists: true };
          return Promise.resolve();
        },
      };

      return fn(tx).then(() => {});
    },

    clear() {
      store.collections = {};
    },
  };

  return store;
}

function findServiceAccountCredentials() {
  // 1. Check explicit environment variable paths
  const candidateEnvPaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
  ].filter(Boolean);

  for (const envPath of candidateEnvPaths) {
    const resolved = path.isAbsolute(envPath) ? envPath : path.resolve(process.cwd(), envPath);
    if (fs.existsSync(resolved)) {
      try {
        const content = JSON.parse(fs.readFileSync(resolved, 'utf8'));
        if (content.project_id && (content.private_key || content.client_email)) {
          return { source: `file (${path.basename(resolved)})`, data: content };
        }
      } catch (e) {
        console.warn(`[Firebase] Could not parse credentials at ${resolved}:`, e.message);
      }
    }
  }

  // 2. Search common file names in server directory and root directory
  const standardNames = [
    'serviceAccountKey.json',
    'firebase-service-account.json',
    'firebase-adminsdk.json',
  ];

  const searchDirs = [
    process.cwd(),
    path.resolve(__dirname, '..'),
    path.resolve(__dirname, '../..'),
  ];

  for (const dir of searchDirs) {
    for (const name of standardNames) {
      const fullPath = path.join(dir, name);
      if (fs.existsSync(fullPath)) {
        try {
          const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          if (content.project_id && (content.private_key || content.client_email)) {
            return { source: `file (${name})`, data: content };
          }
        } catch (e) {
          console.warn(`[Firebase] Could not parse credentials at ${fullPath}:`, e.message);
        }
      }
    }
  }

  // 3. Check individual environment variables in .env
  const pid = process.env.FIREBASE_PROJECT_ID;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY;

  const isPlaceholder = (val) =>
    !val ||
    val.includes('your_firebase') ||
    val.includes('...') ||
    val.trim() === '';

  const hasEnvCreds = pid && email && key && !isPlaceholder(pid) && !isPlaceholder(email) && !isPlaceholder(key);

  if (hasEnvCreds) {
    return {
      source: 'environment variables',
      data: {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').replace(/^["']|["']$/g, ''),
      },
    };
  }

  return null;
}

export function getFirestoreInstance() {
  if (firestoreInstance) return firestoreInstance;

  const credentials = findServiceAccountCredentials();

  if (!credentials) {
    console.log('⚠️  No valid Firebase credentials found — using in-memory store (data lost on restart)');
    console.log('   👉 Tip: Place `serviceAccountKey.json` in `server/` or configure `server/.env` to connect Cloud Firestore.');
    useMemoryStore = true;
    firestoreInstance = getMemoryFirestore();
    return firestoreInstance;
  }

  try {
    const apps = getApps();
    if (apps.length === 0) {
      initializeApp({
        credential: cert(credentials.data),
      });
    }

    firestoreInstance = getFirestore();
    useMemoryStore = false;
    console.log(`✅ Firebase Admin initialized via ${credentials.source} (Cloud Firestore connected)`);
    return firestoreInstance;
  } catch (err) {
    console.error('❌ Firebase init failed, falling back to in-memory store:', err.message);
    useMemoryStore = true;
    firestoreInstance = getMemoryFirestore();
    return firestoreInstance;
  }
}

export { useMemoryStore };

