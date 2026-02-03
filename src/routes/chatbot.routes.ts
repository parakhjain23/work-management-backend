import { Router } from 'express';
import { getEmbedToken } from '../chatbot/gtwy.controller.js';
import { authMiddleware } from '../middleware/auth.proxy.js';

const router = Router();

router.get('/embed-token', authMiddleware, getEmbedToken);

export default router;
