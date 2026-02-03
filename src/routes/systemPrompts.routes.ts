import { Router } from 'express';
import {
  getSystemPrompts,
  getSystemPromptById,
  createSystemPrompt,
  updateSystemPrompt,
  deleteSystemPrompt,
  toggleSystemPrompt
} from '../controllers/systemPrompts.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/', mockAuthMiddleware, getSystemPrompts);
router.get('/:promptId', mockAuthMiddleware, getSystemPromptById);
router.post('/', mockAuthMiddleware, createSystemPrompt);
router.patch('/:promptId', mockAuthMiddleware, updateSystemPrompt);
router.patch('/:promptId/toggle', mockAuthMiddleware, toggleSystemPrompt);
router.delete('/:promptId', mockAuthMiddleware, deleteSystemPrompt);

export default router;
