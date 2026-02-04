import amqp, { Channel, Connection } from 'amqplib';
import { DOMAIN_EVENTS_EXCHANGE, RAG_QUEUE_NAME, SYSTEMPROMPT_QUEUE_NAME } from './queue.types.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection: Connection | null = null;
let channel: Channel | null = null;

/**
 * Purpose: Establish connection to RabbitMQ server with EXCHANGE pattern
 * Creates exchange, queues, and bindings for multi-consumer architecture
 */
export async function connectRabbitMQ(): Promise<void> {
  try {
    if (connection && channel) {
      console.log('[RabbitMQ] Already connected');
      return;
    }

    console.log(`[RabbitMQ] Connecting to ${RABBITMQ_URL}...`);
    
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    // Assert exchange (topic type for future routing flexibility)
    await channel.assertExchange(DOMAIN_EVENTS_EXCHANGE, 'topic', {
      durable: true,
    });

    // Assert RAG queue
    await channel.assertQueue(RAG_QUEUE_NAME, {
      durable: true,
    });

    // Assert System Prompt queue
    await channel.assertQueue(SYSTEMPROMPT_QUEUE_NAME, {
      durable: true,
    });

    // Bind queues to exchange with actionType routing
    // RAG queue: Only work_item actionType (includes all work_item, category, custom_field events)
    await channel.bindQueue(RAG_QUEUE_NAME, DOMAIN_EVENTS_EXCHANGE, 'work_item');
    
    // SystemPrompt queue: Both work_item and system_prompt actionTypes
    await channel.bindQueue(SYSTEMPROMPT_QUEUE_NAME, DOMAIN_EVENTS_EXCHANGE, 'work_item');
    await channel.bindQueue(SYSTEMPROMPT_QUEUE_NAME, DOMAIN_EVENTS_EXCHANGE, 'system_prompt');

    console.log(`[RabbitMQ] Connected - Exchange '${DOMAIN_EVENTS_EXCHANGE}' with queues bound`);

    // Handle connection errors
    connection.on('error', (err: Error) => {
      console.error('[RabbitMQ] Connection error:', err);
      connection = null;
      channel = null;
    });

    connection.on('close', () => {
      console.log('[RabbitMQ] Connection closed');
      connection = null;
      channel = null;
    });

  } catch (error) {
    console.error('[RabbitMQ] Failed to connect:', error);
    connection = null;
    channel = null;
    throw error;
  }
}

/**
 * Purpose: Get active RabbitMQ channel
 * Returns null if not connected
 */
export function getRabbitMQChannel(): Channel | null {
  return channel;
}

/**
 * Purpose: Close RabbitMQ connection gracefully
 */
export async function closeRabbitMQ(): Promise<void> {
  try {
    if (channel) {
      await channel.close();
      channel = null;
    }
    if (connection) {
      await connection.close();
      connection = null;
    }
    console.log('[RabbitMQ] Connection closed gracefully');
  } catch (error) {
    console.error('[RabbitMQ] Error closing connection:', error);
  }
}
