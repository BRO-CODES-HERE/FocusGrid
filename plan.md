# plan.md: Life RPG Solution Approach

## Phase 1: Architecture, Persona & System Design

**Target User Persona**

* **Target Audience:** Gamers, students, and self-improvement enthusiasts dealing with procrastination and delayed gratification.
* **Pain Points:** Traditional habit trackers feel repetitive and transactional; static to-do lists offer no immediate feedback loop.
* **Core Motivation:** Seeking clear progress markers, instant dopamine hits, stat visualizers, streak preservation, and custom rewards.
* **Key Technical Requirements:** Seamless cross-device synchronization, ultra-fast interactions, backend validation against stat inflation/cheating, and full keyboard access.

**Tech Stack Selection**

* **Frontend:** React + Vite + Tailwind CSS + Framer Motion + Canvas-Confetti + Lucide Icons. Designed with a structured dark palette (Midnight Slate `#0F172A`, Dark Indigo `#1E1B4B`, Crisp Emerald `#10B981`, Muted Slate Borders `#334155`) to eliminate generic AI/vibe-coded aesthetics.
* **Backend:** Node.js (Express) serving as the single source of truth to execute anti-cheat progression math, parse JWTs, and handle server-side state updates.
* **Database & Storage:** Firebase Cloud Firestore for real-time relational JSON document persistence (Users, Tasks, Inventory).
* **Authentication:** Supabase Auth (Email/Password & OAuth) returning JWTs to secure custom Node backend API endpoints.

---

## Phase 2: Clean Database Schema & Progression Logic

**Clean Database Schema (Firebase Cloud Firestore)**

* `users` collection (Document ID: `supabase_uid`)
```json
{
  "username": "String",
  "level": 1,
  "total_xp": 0,
  "gold": 50,
  "current_streak": 0,
  "last_active_date": "ISO-Date String",
  "stats": { "intellect": 0, "strength": 0, "agility": 0, "wisdom": 0 },
  "created_at": "Timestamp"
}

```


* `tasks` collection (Document ID: `task_id`)
```json
{
  "user_id": "String (indexed)",
  "title": "String",
  "description": "String",
  "attribute": "intellect | strength | agility | wisdom",
  "xp_reward": 25,
  "gold_reward": 10,
  "completed": false,
  "completed_at": null,
  "created_at": "Timestamp"
}

```


* `inventory` collection (Document ID: `item_id`)
```json
{
  "user_id": "String (indexed)",
  "item_name": "String",
  "cost": 50,
  "purchased_at": "Timestamp"
}

```



**RPG Progression Engine**

* **Non-Linear XP Formula (Server-Side Enforced):**

$$\text{Required XP for Level } N = \left\lfloor 100 \times N^{1.5} \right\rfloor$$


* **Stat Mapping:** Task creation assigns an attribute. Completing a task increases character stats alongside total XP.
* **Streak Maintenance:** Server checks `last_active_date` upon task completion. Completing a task within a 24–48 hour window increments `current_streak`; missing >48 hours resets it to 1.

---

## Phase 3: Backend API Development & 0-Error Strategy

**API Endpoint Routes (Node.js/Express + Firebase Admin SDK)**

* `POST /api/auth/sync` — Accepts Supabase JWT, initializes or retrieves the user document in Firestore.
* `GET /api/tasks` & `POST /api/tasks` — Fetch user tasks or validate/save a new task document.
* `PATCH /api/tasks/:id/complete` — Runs a backend Firestore Transaction to verify task ownership, calculate XP/gold/level adjustments, increment streaks, update stats, and mark the task completed.
* `POST /api/shop/buy` — Verifies user gold, deducts currency, and appends an item to the `inventory` sub-collection/collection.

**Zero-Error Debugging & Defense Strategy**

* **Runtime Schema Validation:** All incoming `req.body` payloads are strictly validated using Zod before reaching controllers to block malformed requests.
* **Centralized Async Error Handler:** All Express routes wrap controller logic in a unified global error handler, preventing process crashes and returning standardized error JSON: `{ "success": false, "message": "Error description" }`.
* **Firebase Admin Initialization Safety:** Implement singleton pattern initialization for Firebase Admin SDK to prevent re-initialization memory leaks during backend restarts.

---

## Phase 4: Frontend UI, Micro-Interactions & Deployment

**UI/UX Implementation**

* **Solid Visual Palette:** Dark slate base cards with crisp 1px borders (`border-slate-800`), explicit typographic scaling, clear attribute color coding (Blue = Intellect, Red = Strength, Green = Agility, Gold = Currency), and zero gradient noise.
* **Micro-Interactions:** Level up popups triggered by Framer Motion overlays, CSS particle explosions upon task completion, and tactile button pressed states.
* **Optimistic Updates & Latency Hiding:** UI state immediately reflects completed tasks while sending background API requests, gracefully rolling back state if the Node server returns an error.
* **Accessibility:** Native focus outlines, ARIA roles for custom progress bars, keyboard shortcuts (`Ctrl+N` for quick task entry), and semantic HTML (`<main>`, `<article>`, `<button>`).

**Deployment & Verification Checklist**

* **Public Repo Setup:** Public GitHub repository containing backend `/server` and frontend `/client`, clean commit log ($\ge 3$ commits), and `.env.example`.
* **Deployment:** Hosted live URL (Vercel/Render) connecting the React application to the Node backend and live Firebase Cloud Firestore instance.
* **Walkthrough Video:** 90–180 second demonstration clip proving signup, task creation, leveling up, shop purchasing, and full persistence across browser refreshes.