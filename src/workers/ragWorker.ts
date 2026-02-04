/**
 * Purpose: RAG worker integrated into main server process
 * Consumes RAG queue messages for document indexing
 */

import { startRagQueueConsumer } from '../queue/rag.queue.consumer.js';
import { RagConsumer } from '../rag/consumer/rag.consumer.js';

/**
 * Purpose: Start RAG worker to consume and process indexing jobs
 */
export async function startRagWorker(): Promise<void> {
  try {
    console.log('[RAG Worker] Starting...');

    // Create RAG consumer
    const ragConsumer = new RagConsumer();

    // Start consuming messages from RAG queue
    await startRagQueueConsumer(async (message) => {
      await ragConsumer.consumeMessage(message);
    });

    console.log('[RAG Worker] ✅ Started - Listening for indexing jobs');
  } catch (error) {
    console.error('[RAG Worker] ❌ Failed to start:', error);
    throw error;
  }
}
