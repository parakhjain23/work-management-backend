import { Router } from 'express';
import {
  getSystemPrompts,
  getSystemPromptById,
  createSystemPrompt,
  updateSystemPrompt,
  deleteSystemPrompt
} from '../controllers/systemPrompts.controller.js';
import { authMiddleware } from '../middleware/auth.proxy.js';

const router = Router();

router.get('/', authMiddleware, getSystemPrompts);
router.get('/:promptId', authMiddleware, getSystemPromptById);
router.post('/', authMiddleware, createSystemPrompt);
router.patch('/:promptId', authMiddleware, updateSystemPrompt);
router.delete('/:promptId', authMiddleware, deleteSystemPrompt);

export default router;
