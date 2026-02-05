/**
 * Purpose: CRUD operations for system prompts
 * Manages prompt definitions, conditions, and templates
 */

import { getPrismaClient } from '../db/prisma.js';

export interface CreateSystemPromptDto {
  name: string;
  eventType?: string;
  conditionLabel?: string;
  promptTemplate: string;
}

export interface UpdateSystemPromptDto {
  name?: string;
  eventType?: string;
  conditionLabel?: string;
  conditionCode?: string;
  promptTemplate?: string;
}

export class SystemPromptsService {
  private prisma = getPrismaClient();

  /**
   * Purpose: Get all system prompts for an organization
   */
  async findAll(orgId: number) {
    return await this.prisma.systemPrompt.findMany({
      where: { orgId },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Purpose: Find prompts by event type
   */
  async findByEventType(orgId: number, eventType: string) {
    return await this.prisma.systemPrompt.findMany({
      where: {
        orgId,
        eventType
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Purpose: Get system prompt by ID
   */
  async findById(promptId: number, orgId: number) {
    const prompt = await this.prisma.systemPrompt.findFirst({
      where: { id: promptId, orgId }
    });

    if (!prompt) {
      throw new Error('System prompt not found');
    }

    return prompt;
  }

  /**
   * Purpose: Create new system prompt and emit event
   */
  async create(orgId: number, userId: number, data: CreateSystemPromptDto) {
    const existing = await this.prisma.systemPrompt.findFirst({
      where: { orgId, name: data.name }
    });

    if (existing) {
      throw new Error('System prompt with this name already exists');
    }

    const prompt = await this.prisma.systemPrompt.create({
      data: {
        orgId,
        name: data.name,
        eventType: data.eventType || null,
        conditionLabel: data.conditionLabel || null,
        conditionCode: null,
        promptTemplate: data.promptTemplate,
        createdBy: userId,
        updatedBy: userId
      }
    });

    // Emit domain event for AI condition generation only if eventType is provided
    if (prompt.eventType) {
      const { domainEventDispatcher, DomainEventDispatcher } = await import('../events/domain.event.dispatcher.js');
      await domainEventDispatcher.emit(
        DomainEventDispatcher.systemPromptEvent(
          'create',
          Number(prompt.id),
          Number(orgId),
          'user',
          prompt.name,
          prompt.eventType,
          prompt.conditionCode,
          prompt.promptTemplate,
          ['name', 'eventType', 'promptTemplate']
        )
      );
    }

    return prompt;
  }

  /**
   * Purpose: Update system prompt and emit event
   */
  async update(promptId: number, orgId: number, userId: number, data: UpdateSystemPromptDto) {
    await this.findById(promptId, orgId);

    const prompt = await this.prisma.systemPrompt.update({
      where: { id: promptId },
      data: {
        ...data,
        updatedBy: userId
      }
    });

    // Emit domain event for AI condition regeneration only if eventType is provided
    if (prompt.eventType) {
      const changedFields = Object.keys(data);
      const { domainEventDispatcher, DomainEventDispatcher } = await import('../events/domain.event.dispatcher.js');
      await domainEventDispatcher.emit(
        DomainEventDispatcher.systemPromptEvent(
          'update',
          Number(prompt.id),
          Number(orgId),
          'user',
          prompt.name,
          prompt.eventType,
          prompt.conditionCode,
          prompt.promptTemplate,
          changedFields
        )
      );
    }

    return prompt;
  }

  /**
   * Purpose: Delete system prompt
   */
  async delete(promptId: number, orgId: number) {
    await this.findById(promptId, orgId);

    await this.prisma.systemPrompt.delete({
      where: { id: promptId }
    });
  }

}
