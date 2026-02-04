/**
 * Purpose: RAG worker integrated into main server process
 * Consumes RAG queue messages for document indexing
 */

import { ConsumeMessage } from 'amqplib';
import { RAG_QUEUE_NAME, RagQueueMessage } from '../queue/queue.types.js';
import { getRabbitMQChannel } from '../queue/rabbitmq.connection.js';
import { RagConsumer } from '../rag/consumer/rag.consumer.js';
import { DomainEvent } from '../types/events.types.js';

/**
 * Purpose: Start RAG worker to consume and process indexing jobs
 */
export async function startRagWorker(): Promise<void> {
  try {
    console.log('[RAG Worker] Starting...');

    // Create RAG consumer
    const ragConsumer = new RagConsumer();
    const channel = getRabbitMQChannel();

    if (!channel) {
      throw new Error('[RAG Queue Consumer] Channel not available');
    }


    await channel.consume(
      RAG_QUEUE_NAME,
      async (msg: ConsumeMessage | null) => {
        if (!msg) {
          return;
        }

        try {
          const messageContent = msg.content.toString();
          const parsedMessage = JSON.parse(messageContent);
          let message: RagQueueMessage | undefined = undefined;

          if (parsedMessage.actionType && parsedMessage.data) {
            // New DomainEvent format
            const domainEvent: DomainEvent = parsedMessage;
            message = {
              entity_type: domainEvent.data.entity as any,
              action: domainEvent.data.action,
              entity_id: Number(domainEvent.data.entity_id),
              org_id: Number(domainEvent.data.org_id),
              changed_fields: domainEvent.data.changedFields,
              timestamp: domainEvent.data.timestamp,
              doc_id: domainEvent.data.doc_id
            };
          }

          if (!message) {
            console.warn('[RAG Queue Consumer] Skipping message with unknown format:', parsedMessage);
            channel.ack(msg);
            return;
          }

          await ragConsumer.consumeMessage(message);

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

    console.log('[RAG Worker] ✅ Started - Listening for indexing jobs');
  } catch (error) {
    console.error('[RAG Worker] ❌ Failed to start:', error);
    throw error;
  }
}
