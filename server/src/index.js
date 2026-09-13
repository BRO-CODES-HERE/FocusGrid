import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  syncUser,
  getTasks,
  createTask,
  completeTask,
  buyItem,
  getUserProfile,
} from './controllers.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// Auth
app.post('/api/auth/sync', syncUser);

// Tasks
app.get('/api/tasks', getTasks);
app.post('/api/tasks', createTask);
app.patch('/api/tasks/:id/complete', completeTask);

// Shop
app.post('/api/shop/buy', buyItem);

// Profile
app.get('/api/profile', getUserProfile);

app.listen(PORT, () => {
  console.log(`FocusGrid server running on port ${PORT}`);
});
