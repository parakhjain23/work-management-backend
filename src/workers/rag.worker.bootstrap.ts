import dotenv from 'dotenv';
import { connectRabbitMQ, closeRabbitMQ } from '../queue/rabbitmq.connection.js';
import { startRagQueueConsumer } from '../queue/rag.queue.consumer.js';
import { RagConsumer } from '../rag/consumer/rag.consumer.js';

dotenv.config();

/**
 * Purpose: Bootstrap RAG worker process (standalone from API server)
 * Initializes RabbitMQ connection and starts consuming messages
 */
async function startRagWorker(): Promise<void> {
  console.log('='.repeat(60));
  console.log('🚀 Starting RAG Worker...');
  console.log('='.repeat(60));

  try {
    // Initialize RabbitMQ connection
    await connectRabbitMQ();
    console.log('✅ RabbitMQ connected');

    // Create RAG consumer
    const ragConsumer = new RagConsumer();

    // Start consuming messages
    await startRagQueueConsumer(async (message) => {
      await ragConsumer.consumeMessage(message);
    });

    console.log('✅ RAG worker started successfully');
    console.log('📥 Waiting for RAG indexing jobs...');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Failed to start RAG worker:', error);
    process.exit(1);
  }
}

/**
 * Purpose: Handle graceful shutdown
 */
async function shutdown(): Promise<void> {
  console.log('\n🛑 Shutting down RAG worker...');
  
  try {
    await closeRabbitMQ();
    console.log('✅ RabbitMQ connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Handle shutdown signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the worker
startRagWorker().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
