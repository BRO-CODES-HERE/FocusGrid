# plan.md: Life RPG Solution Approach

## Phase 1: Architecture, Persona & System Design

**Target User Persona**

* **Profile:** Gamers, students, and self-improvement enthusiasts struggling with delayed gratification.
* **Pain Points:** Traditional to-do apps feel like chores; standard CRUD interfaces lack immediate feedback.
* **Core Motivation:** Wants real-world productivity tied to immediate dopamine loops, visual leveling, streaks, and virtual rewards.
* **Key Requirements:** Cross-device sync, fast responsive interaction, anti-cheat server validation, accessible keyboard navigation.

**Tech Stack Selection**

* **Frontend:** React + Vite + Tailwind CSS + Lucide Icons + Framer Motion. Uses a solid, high-contrast dark palette (Deep Obsidian `#0F172A`, Slate Charcoal `#1E293B`, Electric Violet `#7C3AED`, Emerald Accent `#10B981`) to avoid cheap "vibe-coded" AI templates.
* **Backend:** Node.js (Express) with strict runtime schema validation (Zod) and structured error handling to enforce 0 uncaught errors.
* **Database:** SQLite via Prisma ORM for clean, relational modeling, migration control, and query optimization.
* **Authentication:** Supabase Auth (JWT/Session tokens) verifying identity on every API route to protect user data.

---

## Phase 2: Database Schema & Core Mechanics Engine

**Clean Database Schema (Prisma / SQLite)**

* **Users:** `id` (UUID), `supabase_id` (Indexed), `username`, `total_xp`, `level`, `gold`, `current_streak`, `last_active_date`, `created_at`.
* **Tasks:** `id`, `user_id` (FK), `title`, `description`, `attribute` (INT, STR, DEX, WIS), `xp_reward`, `gold_reward`, `completed` (Boolean), `completed_at`.
* **Inventory / Items:** `id`, `user_id` (FK), `item_name`, `item_type`, `cost`, `purchased_at`.

**RPG Progression Engine**

* **XP Formula:** Non-linear curve calculated backend-side to prevent stat cheating:
$$\text{XP Required for Next Level} = 100 \times (\text{Level})^{1.5}$$


* **Attribute Mapping:** Tasks boost distinct stats (e.g., Coding $\rightarrow$ Intellect, Gym $\rightarrow$ Strength).
* **Streak & Economy Engine:** Increments `current_streak` when completing $\ge 1$ task in a 24-hour window. Rewards users with gold to spend in the virtual reward shop.

---

## Phase 3: Backend API Development & Error Reduction

**API Endpoint Routes**

* `POST /api/auth/sync` — Verifies Supabase JWT and creates/retrieving SQLite user record.
* `GET /api/tasks` & `POST /api/tasks` — Fetch and create tasks for authenticated user.
* `PATCH /api/tasks/:id/complete` — Calculates XP/gold, updates user stats, evaluates level-ups, updates streaks, returns updated state.
* `POST /api/shop/buy` — Deducts gold, validates funds, appends item to user inventory.

**Backend Debugging & 0-Error Strategy**

* **Strict Validation:** Use Zod middleware on all request bodies (`req.body`) to prevent unhandled payloads.
* **Centralized Error Middleware:** Catch all async errors with a global handler returning clean `{ success: false, error: message }` responses instead of throwing runtime exceptions.
* **Optimistic UI Data Alignment:** Ensure all API responses return updated state so the frontend can recover smoothly if optimistic updates fail.

---

## Phase 4: Frontend UI, Polish & Deployment

**UI/UX Implementation**

* **Design & Feel:** Clean layout with structured cards, solid borders (`border-slate-700`), distinct visual hierarchy, micro-interactions for leveling up, and CSS particle triggers on task completion.
* **Latency Management:** Implement optimistic UI updates for instant checkmarks while sending data to the Node backend in the background.
* **Accessibility:** Full keyboard navigation (`Tab`, `Enter`, `Space`), screen reader aria-labels, and high-contrast text ratios.

**Deployment & Verification Checklist**

* **Public GitHub Repo:** Clean commit history ($\ge 3$ commits), backend/frontend source code, `.env.example` file.
* **Database Persistence:** SQLite database attached via persistent storage volume or database host to satisfy true persistence rules.
* **Walkthrough Video:** 90–180 second demonstration showing signup, task creation, completing a task, leveling up, and page refresh.