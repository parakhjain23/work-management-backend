import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.proxy.js';
import { ragSearch } from '../rag/rag.consumer.js';

const router = Router();

router.post('/ai/rag-search', authMiddleware, ragSearch);

export default router;
