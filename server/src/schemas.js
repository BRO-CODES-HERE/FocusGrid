import { z } from 'zod';

export const AuthSyncSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email().optional(),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  attribute: z.enum(['intellect', 'strength', 'agility', 'wisdom']),
  xp_reward: z.number().int().positive().default(25),
  gold_reward: z.number().int().positive().default(10),
});

export const CompleteTaskSchema = z.object({
  task_id: z.string().min(1),
});

export const BuyItemSchema = z.object({
  item_name: z.string().min(1).max(100),
  cost: z.number().int().positive(),
});

