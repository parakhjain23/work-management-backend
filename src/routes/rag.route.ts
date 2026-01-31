import { Router } from 'express';
import { ragSearch } from '../rag/rag.consumer.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const router = Router();

router.post('/ai/rag-search', mockAuthMiddleware, ragSearch);

export default router;
