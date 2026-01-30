import { getRabbitMQChannel } from './rabbitmq.connection.js';
import { RagQueueMessage, RAG_QUEUE_NAME } from './queue.types.js';

/**
 * Purpose: Publish RAG indexing messages to queue (transport only, no business logic)
 * Marks messages as persistent for durability
 */
export async function publishToRagQueue(message: RagQueueMessage): Promise<void> {
  try {
    const channel = getRabbitMQChannel();
    
    if (!channel) {
      console.error('[RAG Queue Publisher] Channel not available, message not published:', message);
      return;
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    const published = channel.sendToQueue(
      RAG_QUEUE_NAME,
      messageBuffer,
      {
        persistent: true,
      }
    );

    if (published) {
      console.log(`[RAG Queue Publisher] Published message: ${message.entity_type} ${message.action} ${message.entity_id}`);
    } else {
      console.warn('[RAG Queue Publisher] Message not published (queue full or channel closed)');
    }

  } catch (error) {
    console.error('[RAG Queue Publisher] Failed to publish message:', error);
  }
}
