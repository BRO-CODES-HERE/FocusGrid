import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  CheckCircle2,
  Sword,
  Brain,
  Zap,
  Scale,
  Users,
  Coins,
  Flame,
  Shield,
  ShoppingCart,
  LogOut,
  AlertCircle,
  Trophy,
  Sparkles,
} from 'lucide-react';

const ATTRIBUTES = [
  { key: 'intellect', label: 'Intellect', icon: Brain, color: 'text-intellect', desc: 'Study, code, read' },
  { key: 'strength', label: 'Strength', icon: Sword, color: 'text-strength', desc: 'Gym, workout, labor' },
  { key: 'agility', label: 'Agility', icon: Zap, color: 'text-agility', desc: 'Run, play sports, dance' },
  { key: 'wisdom', label: 'Wisdom', icon: Scale, color: 'text-wisdom', desc: 'Meditate, journal, reflect' },
];

export default function App() {
  const [pendingUser, setPendingUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [newTask, setNewTask] = useState({ title: '', attribute: 'intellect', description: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [levelUpVisible, setLevelUpVisible] = useState(false);
  const [streakPopup, setStreakPopup] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [shopItems, setShopItems] = useState([
    { id: 1, name: 'Streak Shield', cost: 200, desc: 'Protects your streak for 3 days' },
    { id: 2, name: 'XP Booster', cost: 150, desc: '+50% XP for next 5 tasks' },
    { id: 3, name: 'Gold Magnet', cost: 300, desc: 'Earn 2x gold for 1 hour' },
    { id: 4, name: 'Custom Title', cost: 500, desc: 'Set a unique title for your profile' },
  ]);
  const [purchasedItem, setPurchasedItem] = useState(null);
  const taskInputRef = useRef(null);
  const prevStreakRef = useRef(0);
  const prevLevelRef = useRef(1);

  // ─── Init ─────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        const { initAuth } = await import('./api');
        const { supabase, user } = await initAuth();
        if (!user) {
          setAuthModal(true);
          setLoading(false);
          return;
        }
        await syncAndLoad(supabase);
      } catch (e) {
        console.error(e);
        setError('Failed to initialize — check Supabase credentials');
        setLoading(false);
      }
    }
    init();
  }, []);

  const syncAndLoad = async (supabase) => {
    try {
      const { apiFetch } = await import('./api');
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      await apiFetch('/auth/sync', {
        method: 'POST',
        body: JSON.stringify(email ? { email } : {}),
      });
      const profileData = await apiFetch('/profile');
      setPendingUser(profileData.user);
      setInventory(profileData.inventory || []);
      const tasksData = await apiFetch('/tasks');
      setTasks(tasksData.tasks || []);

      prevStreakRef.current = profileData.user.current_streak || 0;
      prevLevelRef.current = profileData.user.level || 1;

      setLoading(false);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to load data');
      setLoading(false);
    }
  };

  // ─── Auth ─────────────────────────────────────────────────
  const handleAuth = async () => {
    try {
      const { initAuth, signInWithEmail, signUpWithEmail } = await import('./api');
      const { supabase } = await initAuth();

      if (authMode === 'signup') {
        await signUpWithEmail(supabase, email, password);
      } else {
        await signInWithEmail(supabase, email, password);
      }

      await syncAndLoad(supabase);
      setAuthModal(false);
      setEmail('');
      setPassword('');
      setUsername('');
      setError(null);
    } catch (e) {
      setError(e.message || 'Auth failed');
    }
  };

  const handleSignOut = async () => {
    try {
      const { initAuth, signOut } = await import('./api');
      const { supabase } = await initAuth();
      await signOut(supabase);
      localStorage.removeItem('supabase_token');
      setAuthModal(true);
      setPendingUser(null);
      setTasks([]);
    } catch (e) {
      setError(e.message);
    }
  };

  // ─── Sync user after changes ─────────────────────────────
  const refreshUserData = useCallback(async () => {
    try {
      const { apiFetch } = await import('./api');
      const profileData = await apiFetch('/profile');
      setPendingUser(profileData.user);
      setInventory(profileData.inventory || []);

      if (profileData.user.current_streak !== prevStreakRef.current) {
        setStreakPopup(true);
        setTimeout(() => setStreakPopup(false), 3000);
      }
      prevStreakRef.current = profileData.user.current_streak || 0;

      if (profileData.user.level > prevLevelRef.current) {
        setLevelUpVisible(true);
        setTimeout(() => setLevelUpVisible(false), 4000);
      }
      prevLevelRef.current = profileData.user.level || 1;
    } catch (e) {
      console.error(e);
    }
  }, []);

  // ─── Create task ──────────────────────────────────────────
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    try {
      const { apiFetch } = await import('./api');
      const result = await apiFetch('/tasks', {
        method: 'POST',
        body: JSON.stringify(newTask),
      });
      setTasks([result.task, ...tasks]);
      setNewTask({ title: '', attribute: 'intellect', description: '' });
      setSuccess(`Task "${result.task.title}" created!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  // ─── Complete task ────────────────────────────────────────
  const handleComplete = async (taskId) => {
    try {
      const { apiFetch } = await import('./api');
      const result = await apiFetch(`/tasks/${taskId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ task_id: taskId }),
      });

      setTasks(tasks.filter(t => t.id !== taskId));
      setSuccess(`+${result.xp_earned} XP, +${result.gold_earned} Gold!`);

      setTimeout(async () => {
        setSuccess(null);
        await refreshUserData();
      }, 500);

      // Confetti on level up
      if (result.leveled_up) {
        const triggerConfetti = async () => {
          const confetti = await import('canvas-confetti');
          confetti.default({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10B981', '#3B82F6', '#F59E0B'],
          });
        };
        setTimeout(triggerConfetti, 300);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // ─── Shop ─────────────────────────────────────────────────
  const handleBuy = async (item) => {
    try {
      const { apiFetch } = await import('./api');
      const result = await apiFetch('/shop/buy', {
        method: 'POST',
        body: JSON.stringify({ item_name: item.name, cost: item.cost }),
      });
      setPurchasedItem(item.name);
      await refreshUserData();
      setTimeout(() => setPurchasedItem(null), 3000);
    } catch (e) {
      setError(e.message);
    }
  };

  // ─── Keyboard shortcut ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (!pendingUser) return;
        taskInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [pendingUser]);

  // ─── XP Bar ───────────────────────────────────────────────
  const xpForCurrent = (() => {
    const n = pendingUser?.level || 1;
    return Math.floor(100 * Math.pow(n, 1.5));
  })();
  const xpForNext = (() => {
    const n = (pendingUser?.level || 1) + 1;
    return Math.floor(100 * Math.pow(n, 1.5));
  })();
  const xpProgress = Math.min(100, ((pendingUser?.total_xp || 0) / xpForNext) * 100);

  // ─── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald/30 border-t-emerald rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slateText">Loading FocusGrid...</p>
        </div>
      </div>
    );
  }

  // ─── Auth Modal ───────────────────────────────────────────
  if (authModal && !pendingUser) {
    return (
      <div className="min-h-screen bg-midnight flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-indigoDark border-slateBorder rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slateBorder"
        >
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-emerald/20 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Sparkles size={28} className="text-emerald" />
            </div>
            <h1 className="text-2xl font-bold text-white">FocusGrid</h1>
            <p className="text-slateText text-sm mt-1">Your Life RPG</p>
          </div>

          <div className="flex mb-6 bg-midnight/50 rounded-lg p-1">
            <button
              onClick={() => { setAuthMode('login'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === 'login'
                ? 'bg-emerald text-white shadow-sm'
                : 'text-slateText hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${authMode === 'signup'
                ? 'bg-emerald text-white shadow-sm'
                : 'text-slateText hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleAuth(); }} className="space-y-3">
            <div>
              <label className="block text-xs text-slateText mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-indigoDark border border-slateBorder rounded-lg text-white placeholder-slateMuted focus:border-emerald focus:ring-1 focus:ring-emerald/50 outline-none transition-all"
                placeholder="you@example.com"
                required
              />
            </div>
            {authMode === 'signup' && (
              <div>
                <label className="block text-xs text-slateText mb-1">Username (optional)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-indigoDark border border-slateBorder rounded-lg text-white placeholder-slateMuted focus:border-emerald focus:ring-1 focus:ring-emerald/50 outline-none transition-all"
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-slateText mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-indigoDark border border-slateBorder rounded-lg text-white placeholder-slateMuted focus:border-emerald focus:ring-1 focus:ring-emerald/50 outline-none transition-all"
                placeholder="Min 6 characters"
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-red-400 text-sm">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-press w-full py-2.5 bg-emerald hover:bg-emeraldDark text-white font-medium rounded-lg transition-all shadow-lg shadow-emerald/20"
            >
              {authMode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-slateMuted mt-4">
            Powered by Supabase Auth + FocusGrid API
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Main Dashboard ───────────────────────────────────────
  if (!pendingUser) return null;

  const stats = pendingUser.stats || { intellect: 0, strength: 0, agility: 0, wisdom: 0 };

  return (
    <div className="min-h-screen bg-midnight text-white">
      {/* Level-Up Overlay */}
      <AnimatePresence>
        {levelUpVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-indigoDark border-2 border-emerald rounded-2xl p-8 text-center shadow-2xl max-w-sm"
            >
              <div className="w-16 h-16 bg-emerald/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy size={32} className="text-emerald" />
              </div>
              <h2 className="text-3xl font-bold text-emerald mb-2">Level Up!</h2>
              <p className="text-slateText text-lg">You reached Level {pendingUser.level}</p>
              <p className="text-slateMuted text-sm mt-2">
                {xpForNext - (pendingUser.total_xp || 0)} XP to Level {pendingUser.level + 1}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Streak Popup */}
      <AnimatePresence>
        {streakPopup && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigoDark border border-emerald/50 rounded-xl px-4 py-2 shadow-xl z-50 flex items-center gap-2"
          >
            <Flame size={16} className="text-orange-400" />
            <span className="text-emerald font-medium text-sm">
              Streak: {pendingUser.current_streak} days!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-emerald/20 border border-emerald/50 rounded-xl px-4 py-2 shadow-lg z-50 flex items-center gap-2 text-emerald text-sm font-medium"
          >
            <CheckCircle2 size={16} />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Purchased Toast */}
      <AnimatePresence>
        {purchasedItem && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-indigoDark border border-gold/50 rounded-xl px-4 py-2 shadow-lg z-50 flex items-center gap-2 text-gold text-sm font-medium"
          >
            <Shield size={16} />
            Purchased: {purchasedItem}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="border-b border-slateBorder bg-indigoDark/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald/20 rounded-lg flex items-center justify-center">
              <Sparkles size={20} className="text-emerald" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">FocusGrid</h1>
              <p className="text-xs text-slateText">Life RPG</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSignOut}
              className="btn-press p-2 rounded-lg hover:bg-slateBorder/50 text-slateText hover:text-white transition-all"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
            <button
              onClick={() => setShopOpen(true)}
              className="btn-press relative p-2 rounded-lg hover:bg-slateBorder/50 text-slateText hover:text-white transition-all"
              title="Shop"
            >
              <ShoppingCart size={18} />
              {inventory.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gold text-midnight text-[10px] font-bold rounded-full flex items-center justify-center">
                  {inventory.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        <section aria-label="Character Profile">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-indigoDark/40 border border-slateBorder rounded-xl p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{pendingUser.username || 'Player'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-slateText">Level {pendingUser.level}</span>
                  <span className="text-xs text-slateMuted">·</span>
                  <span className="text-sm text-gold">{pendingUser.gold} Gold</span>
                  <span className="text-xs text-slateMuted">·</span>
                  <span className="flex items-center gap-1 text-orange-400 text-sm">
                    <Flame size={14} />
                    {pendingUser.current_streak} day streak
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald">{pendingUser.total_xp || 0}</div>
                <div className="text-xs text-slateMuted">Total XP</div>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slateText mb-1">
                <span>Level {pendingUser.level}</span>
                <span>{pendingUser.total_xp || 0} / {xpForNext} XP</span>
              </div>
              <div className="h-2 bg-slateBorder rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-emerald to-emeraldDark rounded-full"
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              {ATTRIBUTES.map(attr => {
                const Icon = attr.icon;
                const val = stats[attr.key] || 0;
                return (
                  <div
                    key={attr.key}
                    className={`bg-midnight/60 border border-slateBorder rounded-lg p-3 text-center hover:border-slateBorder/80 transition-all`}
                  >
                    <Icon size={18} className={`mx-auto mb-1 ${attr.color}`} />
                    <div className={`text-lg font-bold ${attr.color}`}>{val}</div>
                    <div className="text-[10px] text-slateMuted uppercase tracking-wider">{attr.label}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </section>

        {/* Quick Create + Stats Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Create Task */}
          <section aria-label="Create Task" className="lg:col-span-2">
            <form onSubmit={handleCreateTask} className="bg-indigoDark/40 border border-slateBorder rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-slateText text-sm">
                <Plus size={16} />
                <span>Quick Task</span>
                <span className="text-xs text-slateMuted ml-auto">Ctrl+N</span>
              </div>
              <input
                ref={taskInputRef}
                type="text"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What do you need to do? e.g. 'Finish project report'"
                className="w-full px-3 py-2.5 bg-midnight border border-slateBorder rounded-lg text-white placeholder-slateMuted focus:border-emerald focus:ring-1 focus:ring-emerald/50 outline-none transition-all"
                maxLength={200}
              />
              <div className="flex gap-2">
                <select
                  value={newTask.attribute}
                  onChange={(e) => setNewTask(prev => ({ ...prev, attribute: e.target.value }))}
                  className="flex-1 px-3 py-2.5 bg-midnight border border-slateBorder rounded-lg text-white outline-none focus:border-emerald transition-all cursor-pointer"
                >
                  {ATTRIBUTES.map(a => (
                    <option key={a.key} value={a.key}>{a.label} — {a.desc}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="btn-press px-4 bg-emerald hover:bg-emeraldDark text-white rounded-lg transition-all shadow-sm disabled:opacity-50"
                  disabled={!newTask.title.trim()}
                >
                  <Plus size={18} />
                </button>
              </div>
            </form>
          </section>

          {/* Mini Stats Summary */}
          <section aria-label="Quick Stats">
            <div className="bg-indigoDark/40 border border-slateBorder rounded-xl p-4 h-full flex flex-col justify-center gap-2">
              <div className="flex items-center gap-2 text-slateText text-sm">
                <Users size={16} />
                <span>Active Tasks: <strong className="text-white">{tasks.length}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slateText text-sm">
                <Coins size={16} />
                <span>Gold: <strong className="text-gold">{pendingUser.gold}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-slateText text-sm">
                <Shield size={16} />
                <span>Streak: <strong className="text-orange-400">{pendingUser.current_streak} days</strong></span>
              </div>
            </div>
          </section>
        </div>

        {/* Task List */}
        <section aria-label="Your Tasks">
          <h2 className="text-sm font-semibold text-slateText uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Active Tasks
            {tasks.length > 0 && (
              <span className="text-xs text-slateMuted ml-1">({tasks.length})</span>
            )}
          </h2>

          <AnimatePresence mode="popLayout">
            {tasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-indigoDark/20 border border-slateBorder rounded-xl p-8 text-center"
              >
                <CheckCircle2 size={32} className="mx-auto mb-3 text-slateMuted/50" />
                <p className="text-slateText text-sm">No active tasks yet</p>
                <p className="text-slateMuted text-xs mt-1">Create one above to start earning XP</p>
              </motion.div>
            ) : (
              tasks.map((task, idx) => {
                const AttrIcon = ATTRIBUTES.find(a => a.key === task.attribute)?.icon || Users;
                const attrColor = ATTRIBUTES.find(a => a.key === task.attribute)?.color || 'text-slateText';
                return (
                  <motion.article
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-indigoDark/40 border border-slateBorder rounded-xl p-4 flex items-center gap-3 group hover:border-slateBorder/80 transition-all"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    {/* Attribute indicator */}
                    <div className={`w-1 h-10 rounded-full ${attrColor} flex-shrink-0`} />

                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{task.title}</h3>
                      {task.description && (
                        <p className="text-xs text-slateMuted truncate mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className={`flex items-center gap-1 text-xs ${attrColor}`}>
                          <AttrIcon size={12} />
                          {ATTRIBUTES.find(a => a.key === task.attribute)?.label}
                        </span>
                        <span className="text-xs text-slateMuted">
                          +{task.xp_reward} XP · +{task.gold_reward} Gold
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleComplete(task.id)}
                      className="btn-press flex items-center gap-1.5 bg-emerald/20 hover:bg-emerald/30 border border-emerald/40 text-emerald px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                      aria-label={`Complete task: ${task.title}`}
                    >
                      <CheckCircle2 size={16} />
                      Complete
                    </button>
                  </motion.article>
                );
              })
            )}
          </AnimatePresence>
        </section>

        {/* Error display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-red-400 text-sm flex items-center gap-2 animate-pulse">
            <AlertCircle size={16} />
            {error}
          </div>
        )}
      </main>

      {/* Shop Modal */}
      {shopOpen && (
        <ShopModal
          open={shopOpen}
          onClose={() => setShopOpen(false)}
          inventory={inventory}
          gold={pendingUser.gold}
          items={shopItems}
          onBuy={handleBuy}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slateBorder mt-12 py-4 text-center text-xs text-slateMuted">
        FocusGrid · Life RPG · Built with React + Node + Firebase
      </footer>
    </div>
  );
}

// ─── Shop Modal ────────────────────────────────────────────────
function ShopModal({ open, onClose, inventory, gold, items, onBuy }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-indigoDark border border-slateBorder rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-slateBorder">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShoppingCart size={20} className="text-emerald" />
              Shop
            </h2>
            <p className="text-sm text-slateText mt-0.5">
              <span className="text-gold font-medium">{gold} Gold</span> available
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-press p-2 rounded-lg hover:bg-slateBorder/50 text-slateText transition-all"
            aria-label="Close shop"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-3">
          {items.map(item => {
            const owned = inventory.some(i => i.item_name === item.name);
            return (
              <div
                key={item.id}
                className={`bg-midnight/60 border rounded-xl p-4 transition-all ${owned
                  ? 'border-emerald/30 bg-emerald/5'
                  : 'border-slateBorder hover:border-slateBorder/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-medium">{item.name}</h3>
                    <p className="text-xs text-slateText mt-0.5">{item.desc}</p>
                    {owned && (
                      <span className="inline-block mt-2 text-xs text-emerald bg-emerald/10 border border-emerald/30 rounded-full px-2 py-0.5">
                        Owned
                      </span>
                    )}
                  </div>
                  {!owned && (
                    <button
                      onClick={() => onBuy(item)}
                      className={`btn-press text-sm font-medium rounded-lg transition-all flex items-center gap-1 ${gold >= item.cost
                        ? 'bg-emerald hover:bg-emeraldDark text-white shadow-sm'
                        : 'bg-slateBorder/50 text-slateMuted cursor-not-allowed'
                      }`}
                      disabled={gold < item.cost}
                    >
                      <Coins size={14} />
                      {item.cost} Gold
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
