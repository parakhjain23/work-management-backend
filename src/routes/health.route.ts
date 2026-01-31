import { Router, Request, Response } from 'express';
import { getPrismaClient } from '../db/prisma.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'work-os-backend',
  });
});

router.get('/health/db', async (_req: Request, res: Response) => {
  try {
    const prisma = getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      database: 'connected',
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      database: 'disconnected',
      error: 'Unable to connect to database',
    });
  }
});

export default router;
