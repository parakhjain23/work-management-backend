import { Router } from 'express';
import {
  getSystemPrompts,
  getSystemPromptById,
  createSystemPrompt,
  updateSystemPrompt,
  deleteSystemPrompt,
  toggleSystemPrompt
} from '../controllers/systemPrompts.controller.js';

const router = Router();

router.get('/', getSystemPrompts);
router.get('/:promptId', getSystemPromptById);
router.post('/', createSystemPrompt);
router.patch('/:promptId', updateSystemPrompt);
router.patch('/:promptId/toggle', toggleSystemPrompt);
router.delete('/:promptId', deleteSystemPrompt);

export default router;
