import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import healthRoutes from '../routes/health.js';
import aiSchemaRoutes from '../routes/ai.schema.js';
import aiSqlRoutes from '../routes/ai.sql.js';
import intentRoutes from '../routes/intent.routes.js';
import chatbotRoutes from '../routes/chatbot.js';
import ragRoutes from '../routes/rag.js';
import categoriesRoutes from '../routes/categories.routes.js';
import workItemsRoutes from '../routes/workItems.routes.js';
import customFieldsRoutes from '../routes/customFields.routes.js';
import workItemLogsRoutes from '../routes/workItemLogs.routes.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';

const app = express();

app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());
app.use(mockAuthMiddleware);

app.use((req: Request, _res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - User: ${req.user?.id}`);
  next();
});

app.use('/', healthRoutes);
app.use('/', aiSchemaRoutes);
app.use('/', aiSqlRoutes);
app.use('/', intentRoutes);
app.use('/', chatbotRoutes);
app.use('/', ragRoutes);
app.use('/', categoriesRoutes);
app.use('/', workItemsRoutes);
app.use('/', customFieldsRoutes);
app.use('/', workItemLogsRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
