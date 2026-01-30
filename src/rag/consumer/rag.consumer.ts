import { RagQueueMessage } from '../../queue/queue.types.js';
import { RagProcessor } from './rag.processor.js';

/**
 * Purpose: Accept RAG queue messages and delegate to processor
 * Handles success/failure and provides logging
 */
export class RagConsumer {
  private processor: RagProcessor;

  constructor() {
    this.processor = new RagProcessor();
  }

  /**
   * Purpose: Consume and process RAG queue message
   * Throws error on failure to trigger nack in queue consumer
   */
  public async consumeMessage(message: RagQueueMessage): Promise<void> {
    try {
      console.log(`[RAG Consumer] Consuming message: ${message.entity_type} ${message.action} ${message.entity_id}`);
      
      await this.processor.processMessage(message);
      
      console.log(`[RAG Consumer] Successfully processed message: ${message.entity_type} ${message.action} ${message.entity_id}`);
    } catch (error) {
      console.error(`[RAG Consumer] Failed to process message:`, error);
      throw error;
    }
  }
}
