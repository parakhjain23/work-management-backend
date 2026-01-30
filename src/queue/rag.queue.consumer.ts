import { Channel, ConsumeMessage } from 'amqplib';
import { getRabbitMQChannel } from './rabbitmq.connection.js';
import { RagQueueMessage, RAG_QUEUE_NAME } from './queue.types.js';

/**
 * Purpose: Start consuming messages from RAG queue (transport only, no business logic)
 * Acknowledges messages on success, nacks on failure
 */
export async function startRagQueueConsumer(
  onMessage: (message: RagQueueMessage) => Promise<void>
): Promise<void> {
  const channel = getRabbitMQChannel();
  
  if (!channel) {
    throw new Error('[RAG Queue Consumer] Channel not available');
  }

  console.log(`[RAG Queue Consumer] Starting consumer for queue: ${RAG_QUEUE_NAME}`);

  await channel.consume(
    RAG_QUEUE_NAME,
    async (msg: ConsumeMessage | null) => {
      if (!msg) {
        return;
      }

      try {
        const messageContent = msg.content.toString();
        const message: RagQueueMessage = JSON.parse(messageContent);

        console.log(`[RAG Queue Consumer] Received message: ${message.entity_type} ${message.action} ${message.entity_id}`);

        await onMessage(message);

        channel.ack(msg);
        console.log(`[RAG Queue Consumer] Message acknowledged`);

      } catch (error) {
        console.error('[RAG Queue Consumer] Error processing message:', error);
        channel.nack(msg, false, false);
        console.log('[RAG Queue Consumer] Message nacked (not requeued)');
      }
    },
    {
      noAck: false,
    }
  );

  console.log(`[RAG Queue Consumer] Consumer started, waiting for messages...`);
}
