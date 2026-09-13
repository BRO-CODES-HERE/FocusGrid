import { getFirestoreInstance } from './firebase.js';
import { AuthSyncSchema, CreateTaskSchema, CompleteTaskSchema, BuyItemSchema } from './schemas.js';
import { createHmac } from 'node:crypto';

const db = getFirestoreInstance();

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return null;

  const expectedSig = createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  if (signatureB64 !== expectedSig) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
  } catch {
    return null;
  }
  if (payload && payload.sub) return payload.sub;

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

    const validated = AuthSyncSchema.safeParse({ supabase_uid: uid, email: req.body?.email });
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

function xpForLevel(n) {
  return Math.floor(100 * Math.pow(n, 1.5));
}

export async function completeTask(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const uid = verifyToken(authHeader.slice(7));
    if (!uid) return res.status(401).json({ success: false, message: 'Invalid token' });

    const rawId = req.body?.task_id || req.params.id;
    const validated = CompleteTaskSchema.safeParse({ task_id: rawId });
    if (!validated.success) return res.status(400).json({ success: false, message: validated.error.message });

    const taskRef = db.collection('tasks').doc(validated.data.task_id);
    const userRef = db.collection('users').doc(uid);
    const now = new Date();
    let result = null;

    await db.runTransaction(async (transaction) => {
      const taskSnap = await transaction.get(taskRef);
      if (!taskSnap.exists) {
        const e = new Error('Task not found');
        e.statusCode = 404;
        throw e;
      }
      const task = taskSnap.data();
      if (task.user_id !== uid) {
        const e = new Error('Not your task');
        e.statusCode = 403;
        throw e;
      }
      if (task.completed) {
        const e = new Error('Already completed');
        e.statusCode = 400;
        throw e;
      }

      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        const e = new Error('User not found');
        e.statusCode = 404;
        throw e;
      }
      const user = userSnap.data();

      const xpReward = task.xp_reward || 25;
      const goldReward = task.gold_reward || 10;

      let newLevel = user.level || 1;
      const newTotalXp = (user.total_xp || 0) + xpReward;
      let leveledUp = false;
      while (newTotalXp >= xpForLevel(newLevel + 1)) {
        newLevel++;
        leveledUp = true;
      }

      const lastActive = user.last_active_date ? new Date(user.last_active_date) : null;
      let newStreak = 1;
      if (lastActive && !Number.isNaN(lastActive.getTime())) {
        const diffHours = (now - lastActive) / (1000 * 60 * 60);
        newStreak = diffHours <= 48 ? (user.current_streak || 0) + 1 : 1;
      }

      const stats = { ...(user.stats || { intellect: 0, strength: 0, agility: 0, wisdom: 0 }) };
      if (stats[task.attribute] !== undefined) {
        stats[task.attribute] += 1;
      }

      transaction.update(userRef, {
        level: newLevel,
        total_xp: newTotalXp,
        gold: (user.gold || 0) + goldReward,
        current_streak: newStreak,
        last_active_date: now.toISOString(),
        stats,
      });

      transaction.update(taskRef, {
        completed: true,
        completed_at: now.toISOString(),
      });

      result = { xpReward, goldReward, newLevel, leveledUp, newStreak };
    });

    const updatedUser = await userRef.get().then(doc => doc.data());
    res.json({
      success: true,
      task_completed: true,
      xp_earned: result.xpReward,
      gold_earned: result.goldReward,
      new_level: result.newLevel,
      leveled_up: result.leveledUp,
      new_streak: result.newStreak,
      user: updatedUser,
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
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
    const itemRef = db.collection('inventory').doc();

    await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        const e = new Error('User not found');
        e.statusCode = 404;
        throw e;
      }
      const user = userSnap.data();
      if ((user.gold || 0) < validated.data.cost) {
        const e = new Error('Not enough gold');
        e.statusCode = 400;
        throw e;
      }
      transaction.update(userRef, {
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
    if (err.statusCode) {
      return res.status(err.statusCode).json({ success: false, message: err.message });
    }
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
    if (!snapshot.exists) return res.status(404).json({ success: false, message: 'User not found' });

    const inventorySnapshot = await db.collection('inventory').where('user_id', '==', uid).get();
    const inventory = inventorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({
      success: true,
      user: snapshot.data(),
      inventory,
    });
  } catch (err) {
    next(err);
  }
}
