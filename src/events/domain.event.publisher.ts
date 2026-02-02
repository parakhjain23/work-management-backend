/**
 * Purpose: Publish domain events to RabbitMQ for system prompt processing
 */

import { DomainEvent } from '../types/events.types.js';
import { getRabbitMQChannel } from '../queue/rabbitmq.connection.js';

const DOMAIN_EVENTS_EXCHANGE = 'domain_events';
const EXCHANGE_TYPE = 'topic';

/**
 * Purpose: Publish domain event to RabbitMQ exchange
 * Events are routed based on pattern: {entity}.{action}
 * Example: work_item.update, custom_field_value.create
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

    // Create routing key: entity.action (e.g., work_item.update)
    const routingKey = `${event.entity}.${event.action}`;

    // Serialize event (convert BigInt to string)
    const eventPayload = JSON.stringify(event, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );

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
      entity_id: event.entity_id,
      work_item_id: event.work_item_id,
      changedFields: event.changedFields
    });
  } catch (error) {
    console.error('[Domain Event Publisher] Failed to publish event:', error);
    // Don't throw - publishing failure should not break the API
  }
}
