# Life RPG: Gamified Productivity System

> Bridge the gap between real-world goals and video game dopamine. **Life RPG** translates daily tasks into character progression, attributes, streaks, and custom virtual rewards.

---

## Features

* **User Authentication & Anti-Cheat:** Secure signup, login, and token-based API authentication via Supabase Auth to ensure stats are validated server-side.
* **Non-Linear RPG Progression:** XP requirements scale exponentially per level:
$$\text{Required XP for Level } N = \left\lfloor 100 \times N^{1.5} \right\rfloor$$


* **Attribute Mapping:** Tasks boost specific character stats upon completion (e.g., Coding $\rightarrow$ Intellect, Gym $\rightarrow$ Strength).
* **Streak System:** Tracks consecutive daily activity with server-checked active date validation.
* **Virtual Economy & Shop:** Earn gold by completing tasks and spend currency on custom rewards or in-game badges.
* **Tactile Dark UI & Micro-interactions:** Built with React, Tailwind CSS, and Framer Motion—featuring responsive layouts, particle effects, and high-contrast styling.
* **Optimistic UI & Latency Hiding:** Instant UI responsiveness backed by resilient background state synchronization.

---

## Tech Stack

* **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Lucide Icons, Canvas-Confetti
* **Backend:** Node.js, Express, Zod (Schema Validation), Firebase Admin SDK
* **Database & Storage:** Firebase Cloud Firestore
* **Authentication:** Supabase Auth (JWT)

---

## System Architecture

```
┌─────────────────┐       Supabase JWT        ┌──────────────────────────┐
│                 ├──────────────────────────>│                          │
│  React (Vite)   │                           │  Node.js / Express API   │
│   Frontend      │<──────────────────────────┤  (Anti-Cheat Engine)     │
└─────────────────┘       JSON Response       └────────────┬─────────────┘
                                                           │
                                                  Firebase Admin SDK
                                                           │
                                                           v
                                              ┌──────────────────────────┐
                                              │ Firebase Cloud Firestore │
                                              └──────────────────────────┘

```

---

## Getting Started

### Prerequisites

* Node.js (v18+ recommended)
* npm or pnpm
* Supabase Account (for Auth keys)
* Firebase Project (with Cloud Firestore enabled)

### Installation & Local Setup

1. **Clone the repository:**
```bash
git clone https://github.com/your-username/life-rpg.git
cd life-rpg

```


2. **Setup the Backend:**
```bash
cd server
npm install
cp .env.example .env
# Populate .env with your Supabase JWT secrets and Firebase Admin credentials
npm run dev

```


3. **Setup the Frontend:**
```bash
cd ../client
npm install
cp .env.example .env
# Populate .env with your Supabase Project URL and Anon Key
npm run dev

```



---

## Environment Variables

### Backend (`/server/.env.example`)

```env
PORT=5000
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

```

### Frontend (`/client/.env.example`)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:5000/api

```

---

## API Endpoints Overview

| Method | Endpoint | Description | Auth Required |
| --- | --- | --- | --- |
| `POST` | `/api/auth/sync` | Verifies JWT and syncs user record with Firestore | Yes |
| `GET` | `/api/tasks` | Fetches all active tasks for authenticated user | Yes |
| `POST` | `/api/tasks` | Creates a new task with attribute assignment | Yes |
| `PATCH` | `/api/tasks/:id/complete` | Validates completion, awards XP/gold, updates stats & streaks | Yes |
| `POST` | `/api/shop/buy` | Validates gold balance and appends item to inventory | Yes |

---

## Demo & Verification

* **Live Deployment:** [https://your-deployment-link.com](https://www.google.com/search?q=https://your-deployment-link.com)
* **Walkthrough Video:** Included in repository at `./demo/walkthrough.mp4` *(Demonstrates auth, task creation, leveling mechanics, and data persistence on refresh)*