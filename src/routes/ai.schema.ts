import { Router } from 'express';
import { getSchema } from '../ai/schema.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.get('/ai/schema', mockAuthMiddleware, getSchema);

export default router;
