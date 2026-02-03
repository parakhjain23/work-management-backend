import { Router } from 'express';
import {
  getSystemPrompts,
  getSystemPromptById,
  createSystemPrompt,
  updateSystemPrompt,
  deleteSystemPrompt,
  toggleSystemPrompt
} from '../controllers/systemPrompts.controller.js';
import { authMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/', authMiddleware, getSystemPrompts);
router.get('/:promptId', authMiddleware, getSystemPromptById);
router.post('/', authMiddleware, createSystemPrompt);
router.patch('/:promptId', authMiddleware, updateSystemPrompt);
router.patch('/:promptId/toggle', authMiddleware, toggleSystemPrompt);
router.delete('/:promptId', authMiddleware, deleteSystemPrompt);

export default router;
