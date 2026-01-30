import amqp, { Channel, Connection } from 'amqplib';
import { RAG_QUEUE_NAME } from './queue.types.js';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection: Connection | null = null;
let channel: Channel | null = null;

/**
 * Purpose: Establish connection to RabbitMQ server
 * Creates connection and channel, asserts durable queue
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

    // Assert durable queue
    await channel.assertQueue(RAG_QUEUE_NAME, {
      durable: true,
    });

    console.log(`[RabbitMQ] Connected and queue '${RAG_QUEUE_NAME}' asserted`);

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
