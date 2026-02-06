import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.proxy.js';
import { ragSearch } from '../rag/rag.consumer.js';

const router = Router();

router.post('/search', ragSearch);

export default router;
