/**
 * Purpose: Publish domain events to RabbitMQ for system prompt processing
 */

import { DomainEvent } from '../types/events.types.js';
import { getRabbitMQChannel } from '../queue/rabbitmq.connection.js';
import { DOMAIN_EVENTS_EXCHANGE } from '../queue/queue.types.js';

const EXCHANGE_TYPE = 'topic';

/**
 * Purpose: Publish domain event to RabbitMQ exchange
 * Events are routed based on pattern: {entity}.{action}
 * Example: work_item.update, system_prompt.create
 */
export async function publishDomainEvent(event: DomainEvent): Promise<void> {
  try {
    const channel = getRabbitMQChannel();

    if (!channel) {
      console.error('[Domain Event Publisher] Channel not available');
      return;
    }

    // Ensure exchange exists
    await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, EXCHANGE_TYPE, {
      durable: true
    });

    // Create routing key based on actionType (work_item or system_prompt)
    // This ensures proper queue routing via wildcard bindings
    const routingKey = event.actionType;

    // Serialize event (no BigInt conversion needed)
    const eventPayload = JSON.stringify(event);

    // Publish to exchange
    channel.publish(
      DOMAIN_EVENTS_EXCHANGE,
      routingKey,
      Buffer.from(eventPayload),
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now()
      }
    );

    console.log(`[Domain Event Publisher] Published: ${routingKey}`, {
      actionType: event.actionType,
      entity_id: event.data.entity_id,
      work_item_id: event.data.work_item_id,
      changedFields: event.data.changedFields
    });
  } catch (error) {
    console.error('[Domain Event Publisher] Failed to publish event:', error);
    // Don't throw - publishing failure should not break the API
  }
}
