import { Router } from 'express';
import { executeSql } from '../ai/sql.controller.js';
import { authMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.post('/execute-sql', authMiddleware, executeSql);

export default router;
