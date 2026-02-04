import { config } from './config/env.js';
import app from './app/server.js';
import { getPrismaClient } from './db/prisma.js';
import { connectRabbitMQ, closeRabbitMQ } from './queue/rabbitmq.connection.js';
import { startSystemPromptWorker } from './workers/systemPromptWorker.js';
import { startRagWorker } from './workers/ragWorker.js';

async function bootstrap() {
  try {
    console.log('🚀 Starting work-os-backend...');
    
    const prisma = getPrismaClient();
    console.log('✅ Prisma client initialized');
    
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Initialize RabbitMQ for event publishing and workers
    try {
      await connectRabbitMQ();
      console.log('✅ RabbitMQ connected');
      
      // Start system prompt worker to consume domain events
      await startSystemPromptWorker();
      
      // Start RAG worker to consume indexing jobs
      await startRagWorker();
    } catch (error) {
      console.warn('⚠️  RabbitMQ connection failed - workers will not start:', error);
    }
    
    const server = app.listen(config.server.port, () => {
      console.log(`✅ Server running on port ${config.server.port}`);
      console.log(`   Health check: http://localhost:${config.server.port}/health`);
      console.log(`   DB health: http://localhost:${config.server.port}/health/db`);
    });

    const shutdown = async () => {
      console.log('\n🛑 Shutting down gracefully...');
      
      await closeRabbitMQ();
      console.log('✅ RabbitMQ connection closed');
      
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
