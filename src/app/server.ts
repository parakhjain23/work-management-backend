import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import aiSchemaRoutes from '../routes/ai.schema.js';
import aiSqlRoutes from '../routes/ai.sql.js';
import intentRoutes from '../routes/intent.routes';
import categoriesRoutes from '../routes/categories.routes.js';
import workItemsRoutes from '../routes/workItems.routes.js';
import customFieldsRoutes from '../routes/customFields.routes.js';
import workItemLogsRoutes from '../routes/workItemLogs.routes.js';
import followersRoutes from '../routes/followers.routes.js';
import systemPromptsRoutes from '../routes/systemPrompts.routes.js';
import { mockAuthMiddleware } from '../middleware/auth.mock.js';
import chatbotRoutes from '../routes/chatbot.routes.js';
import healthRoutes from '../routes/health.route.js';
import ragRoutes from '../routes/rag.route.js';

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
app.use('/ai/schema', aiSchemaRoutes);
app.use('/ai/sql', aiSqlRoutes);
app.use('/', intentRoutes);
app.use('/chatbot', chatbotRoutes);
app.use('/rag', ragRoutes);
app.use('/categories', categoriesRoutes);
app.use('/work-items', workItemsRoutes);
app.use('/custom-fields', customFieldsRoutes);
app.use('/work-item-logs', workItemLogsRoutes);
app.use('/followers', followersRoutes);
app.use('/system-prompts', systemPromptsRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
