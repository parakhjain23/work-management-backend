import { ConsumeMessage } from 'amqplib';
import { DomainEvent } from '../types/events.types.js';
import { RAG_QUEUE, RagQueueMessage } from './queue.types.js';
import { getRabbitMQChannel } from './rabbitmq.connection.js';

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

  console.log(`[RAG Queue Consumer] Starting consumer for queue: ${RAG_QUEUE}`);

  await channel.consume(
    RAG_QUEUE,
    async (msg: ConsumeMessage | null) => {
      if (!msg) {
        return;
      }

      try {
        const messageContent = msg.content.toString();
        const parsedMessage = JSON.parse(messageContent);

        let message: RagQueueMessage;

        // Check if it's a DomainEvent (new format) or old flat format
        if (parsedMessage.actionType && parsedMessage.data) {
          // New DomainEvent format
          const domainEvent: DomainEvent = parsedMessage;
          message = {
            entity_type: domainEvent.data.entity as any,
            action: domainEvent.data.action,
            entity_id: Number(domainEvent.data.entity_id),
            org_id: Number(domainEvent.data.org_id),
            changed_fields: domainEvent.data.changedFields,
            timestamp: domainEvent.data.timestamp
          };
        } else if (parsedMessage.entity_type) {
          // Old flat format (backward compatibility)
          message = parsedMessage as RagQueueMessage;
        } else {
          throw new Error('Unknown message format');
        }

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
