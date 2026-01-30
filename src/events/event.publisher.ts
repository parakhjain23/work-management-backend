import { StandardEvent } from './event.dispatcher.centralized.js';
import { getRabbitMQChannel } from '../queue/rabbitmq.connection.js';
import { DOMAIN_EVENTS_EXCHANGE } from '../queue/queue.types.js';

/**
 * Purpose: Publish domain events to RabbitMQ exchange
 * Fire-and-forget pattern - no business logic
 */
export async function publishDomainEvent(event: StandardEvent): Promise<void> {
  try {
    const channel = getRabbitMQChannel();
    
    if (!channel) {
      console.error('[Event Publisher] Channel not available, event not published:', {
        entity: event.entity,
        action: event.action,
        entity_id: event.entity_id.toString()
      });
      return;
    }

    // Serialize event (convert BigInt to string)
    const serializedEvent = {
      ...event,
      entity_id: event.entity_id.toString(),
      parent_id: event.parent_id ? event.parent_id.toString() : undefined
    };

    const messageBuffer = Buffer.from(JSON.stringify(serializedEvent));
    
    // Publish to exchange with routing key '#' (broadcast to all bound queues)
    const published = channel.publish(
      DOMAIN_EVENTS_EXCHANGE,
      '', // Empty routing key for topic exchange with '#' binding
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json'
      }
    );

    if (published) {
      console.log(`[Event Publisher] Published to exchange: ${event.entity} ${event.action} ${event.entity_id}`);
    } else {
      console.warn('[Event Publisher] Message not published (channel buffer full)');
    }

  } catch (error) {
    console.error('[Event Publisher] Failed to publish event:', error);
  }
}
