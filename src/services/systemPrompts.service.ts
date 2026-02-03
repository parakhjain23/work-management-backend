/**
 * Purpose: CRUD operations for system prompts
 * Manages prompt definitions, conditions, and templates
 */

import { getPrismaClient } from '../db/prisma.js';

export interface CreateSystemPromptDto {
  name: string;
  keyName: string;
  description?: string;
  eventTypes: string[];
  conditionCode?: string;
  promptTemplate: string;
  isActive?: boolean;
  priority?: number;
}

export interface UpdateSystemPromptDto {
  name?: string;
  description?: string;
  eventTypes?: string[];
  conditionCode?: string;
  promptTemplate?: string;
  isActive?: boolean;
  priority?: number;
}

export class SystemPromptsService {
  private prisma = getPrismaClient();

  /**
   * Purpose: Get all system prompts for an organization
   */
  async findAll(orgId: bigint) {
    return await this.prisma.systemPrompt.findMany({
      where: { orgId },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    });
  }

  /**
   * Purpose: Find active prompts that match the given event type
   * Checks if eventType is in the prompt's eventTypes array
   */
  async findActiveByEventType(orgId: bigint, eventType: string) {
    return await this.prisma.systemPrompt.findMany({
      where: {
        orgId,
        eventTypes: {
          has: eventType
        },
        isActive: true
      },
      orderBy: {
        priority: 'desc'
      }
    });
  }

  /**
   * Purpose: Get system prompt by ID
   */
  async findById(promptId: bigint, orgId: bigint) {
    const prompt = await this.prisma.systemPrompt.findFirst({
      where: { id: promptId, orgId }
    });

    if (!prompt) {
      throw new Error('System prompt not found');
    }

    return prompt;
  }

  /**
   * Purpose: Create new system prompt
   */
  async create(orgId: bigint, userId: bigint, data: CreateSystemPromptDto) {
    const existing = await this.prisma.systemPrompt.findFirst({
      where: { orgId, keyName: data.keyName }
    });

    if (existing) {
      throw new Error('System prompt with this key_name already exists');
    }

    return await this.prisma.systemPrompt.create({
      data: {
        orgId,
        name: data.name,
        keyName: data.keyName,
        description: data.description,
        eventTypes: data.eventTypes,
        conditionCode: data.conditionCode,
        promptTemplate: data.promptTemplate,
        isActive: data.isActive ?? true,
        priority: data.priority ?? 0,
        createdBy: userId,
        updatedBy: userId
      }
    });
  }

  /**
   * Purpose: Update system prompt
   */
  async update(promptId: bigint, orgId: bigint, userId: bigint, data: UpdateSystemPromptDto) {
    await this.findById(promptId, orgId);

    return await this.prisma.systemPrompt.update({
      where: { id: promptId },
      data: {
        ...data,
        updatedBy: userId
      }
    });
  }

  /**
   * Purpose: Delete system prompt
   */
  async delete(promptId: bigint, orgId: bigint) {
    await this.findById(promptId, orgId);

    await this.prisma.systemPrompt.delete({
      where: { id: promptId }
    });
  }

  /**
   * Purpose: Toggle system prompt active status
   */
  async toggleActive(promptId: bigint, orgId: bigint, userId: bigint) {
    const prompt = await this.findById(promptId, orgId);

    return await this.prisma.systemPrompt.update({
      where: { id: promptId },
      data: {
        isActive: !prompt.isActive,
        updatedBy: userId
      }
    });
  }
}
