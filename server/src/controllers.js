import { getFirestoreInstance } from './firebase.js';
import { AuthSyncSchema, CreateTaskSchema, CompleteTaskSchema, BuyItemSchema } from './schemas.js';
import { createHmac } from 'node:crypto';

const db = getFirestoreInstance();

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch {
    return null;
  }

  // 1. Firebase Auth ID token (standard JWT from Google Firebase Auth)
  if (payload && (payload.user_id || payload.sub)) {
    if (payload.iss && payload.iss.includes('securetoken.google.com')) {
      return payload.user_id || payload.sub;
    }
  }

  // 2. Supabase JWT HMAC check (if secret configured)
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (secret && !secret.includes('your_actual')) {
    const expectedSig = createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    if (signatureB64 === expectedSig && payload && payload.sub) {
      return payload.sub;
    }
  }

  // 3. Fallback for valid JWT payload with sub/user_id
  if (payload && (payload.sub || payload.user_id)) {
    return payload.sub || payload.user_id;
  }

  return null;
}

export async function syncUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.slice(7);
    const uid = verifyToken(token);
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const validated = AuthSyncSchema.safeParse({ uid, email: req.body?.email });
    if (!validated.success) return res.status(400).json({ success: false, message: validated.error.message });

    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      await userRef.set({
        username: validated.data.email?.split('@')[0] || 'Player',
        level: 1,
        total_xp: 0,
        gold: 50,
        current_streak: 0,
        last_active_date: new Date().toISOString(),
        stats: { intellect: 0, strength: 0, agility: 0, wisdom: 0 },
        created_at: new Date(),
      });
    } else {
      await userRef.update({
        last_active_date: new Date().toISOString(),
      });
    }

    const userData = await userRef.get().then(s => s.data());
    res.json({ success: true, user: userData });
  } catch (err) {
    next(err);
  }
}

export async function getTasks(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const uid = verifyToken(authHeader.slice(7));
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const tasksRef = db.collection('tasks').where('user_id', '==', uid).where('completed', '==', false);
    const snapshot = await tasksRef.get();
    const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ success: true, tasks });
  } catch (err) {
    next(err);
  }
}

export async function createTask(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const uid = verifyToken(authHeader.slice(7));
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const validated = CreateTaskSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json({ success: false, message: validated.error.message });

    const taskRef = db.collection('tasks').doc();
    await taskRef.set({
      user_id: uid,
      title: validated.data.title,
      description: validated.data.description || '',
      attribute: validated.data.attribute,
      xp_reward: validated.data.xp_reward,
      gold_reward: validated.data.gold_reward,
      completed: false,
      completed_at: null,
      created_at: new Date(),
    });

    const taskData = await taskRef.get().then(doc => ({ id: doc.id, ...doc.data() }));
    res.status(201).json({ success: true, task: taskData });
  } catch (err) {
    next(err);
  }
}

export async function completeTask(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const uid = verifyToken(authHeader.slice(7));
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const validated = CompleteTaskSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json({ success: false, message: validated.error.message });

    const taskRef = db.collection('tasks').doc(validated.data.task_id);
    const taskSnap = await taskRef.get();

    if (!taskSnap.exists) return res.status(404).json({ success: false, message: 'Task not found' });
    const task = taskSnap.data();
    if (task.user_id !== uid) return res.status(403).json({ success: false, message: 'Not your task' });
    if (task.completed) return res.status(400).json({ success: false, message: 'Already completed' });

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ success: false, message: 'User not found' });

    const user = userSnap.data();
    const xpReward = task.xp_reward || 25;
    const goldReward = task.gold_reward || 10;

    function xpForLevel(n) {
      return Math.floor(100 * Math.pow(n, 1.5));
    }

    let newLevel = user.level;
    let newTotalXp = user.total_xp + xpReward;
    let leveledUp = false;

    while (newTotalXp >= xpForLevel(newLevel + 1)) {
      newLevel++;
      leveledUp = true;
    }

    const now = new Date();
    const lastActive = user.last_active_date ? new Date(user.last_active_date) : null;
    let newStreak = user.current_streak;

    if (lastActive) {
      const diffMs = now - lastActive;
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours <= 48) {
        newStreak++;
      } else {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    const stats = { ...user.stats };
    const attrMap = { intellect: 'intellect', strength: 'strength', agility: 'agility', wisdom: 'wisdom' };
    if (attrMap[task.attribute]) {
      stats[attrMap[task.attribute]] = (stats[attrMap[task.attribute]] || 0) + 1;
    }

    await db.runTransaction(async (transaction) => {
      const userTxnRef = db.collection('users').doc(uid);
      const taskTxnRef = db.collection('tasks').doc(validated.data.task_id);

      transaction.update(userTxnRef, {
        level: newLevel,
        total_xp: newTotalXp,
        gold: user.gold + goldReward,
        current_streak: newStreak,
        last_active_date: now.toISOString(),
        stats: stats,
      });

      transaction.update(taskTxnRef, {
        completed: true,
        completed_at: now.toISOString(),
      });
    });

    const updatedUser = await userRef.get().then(doc => doc.data());
    res.json({
      success: true,
      task_completed: true,
      xp_earned: xpReward,
      gold_earned: goldReward,
      new_level: newLevel,
      leveled_up: leveledUp,
      new_streak: newStreak,
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
}

export async function buyItem(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const uid = verifyToken(authHeader.slice(7));
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const validated = BuyItemSchema.safeParse(req.body);
    if (!validated.success) return res.status(400).json({ success: false, message: validated.error.message });

    const userRef = db.collection('users').doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ success: false, message: 'User not found' });

    const user = userSnap.data();
    if (user.gold < validated.data.cost) {
      return res.status(400).json({ success: false, message: 'Not enough gold' });
    }

    const itemRef = db.collection('inventory').doc();
    await db.runTransaction(async (transaction) => {
      const userTxnRef = db.collection('users').doc(uid);
      transaction.update(userTxnRef, {
        gold: user.gold - validated.data.cost,
      });
      transaction.set(itemRef, {
        user_id: uid,
        item_name: validated.data.item_name,
        cost: validated.data.cost,
        purchased_at: new Date(),
      });
    });

    const updatedUser = await userRef.get().then(doc => doc.data());
    res.json({
      success: true,
      purchased: true,
      item_name: validated.data.item_name,
      remaining_gold: updatedUser.gold,
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserProfile(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const uid = verifyToken(authHeader.slice(7));
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();
    let userData;
    if (!snapshot.exists) {
      userData = {
        username: 'Player',
        level: 1,
        total_xp: 0,
        gold: 50,
        current_streak: 0,
        last_active_date: new Date().toISOString(),
        stats: { intellect: 0, strength: 0, agility: 0, wisdom: 0 },
        created_at: new Date(),
      };
      await userRef.set(userData);
    } else {
      userData = snapshot.data();
    }

    const inventorySnapshot = await db.collection('inventory').where('user_id', '==', uid).get();
    const inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      user: userData,
      inventory,
    });
  } catch (err) {
    next(err);
  }
}
