import { Router } from 'express';
import { getEmbedToken } from '../chatbot/gtwy.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/chatbot/embed-token', mockAuthMiddleware, getEmbedToken);

export default router;
