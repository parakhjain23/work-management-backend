import { Router } from 'express';
import { executeSql } from '../ai/sql.controller.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.post('/ai/execute-sql', mockAuthMiddleware, executeSql);

export default router;
