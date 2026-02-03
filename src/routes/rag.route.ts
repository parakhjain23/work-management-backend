import { Router } from 'express';
import { ragSearch } from '../rag/rag.consumer.js';
import { authMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.post('/ai/rag-search', authMiddleware, ragSearch);

export default router;
