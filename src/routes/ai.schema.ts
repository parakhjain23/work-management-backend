import { Router } from 'express';
import { getSchema } from '../ai/schema.controller.js';
import { authMiddleware } from '../middleware/auth.proxy.js';

const router = Router();

router.get('/ai/schema', authMiddleware, getSchema);

export default router;
