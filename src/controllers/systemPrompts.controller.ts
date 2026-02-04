/**
 * Purpose: API endpoints for system prompts management
 */

import { Request, Response } from 'express';
import { SystemPromptsService } from '../services/systemPrompts.service.js';
import { serializeBigInt } from '../utils/bigint.serializer.js';

const service = new SystemPromptsService();

/**
 * Purpose: Get all system prompts for organization
 */
export const getSystemPrompts = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = Number(req.user!.org_id);
    const prompts = await service.findAll(orgId);

    res.json({
      success: true,
      data: serializeBigInt(prompts)
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Purpose: Get system prompt by ID
 */
export const getSystemPromptById = async (req: Request, res: Response): Promise<void> => {
  try {
    const promptId = Number(req.params.promptId);
    const orgId = Number(req.user!.org_id);

    const prompt = await service.findById(promptId, orgId);

    res.json({
      success: true,
      data: serializeBigInt(prompt)
    });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
};

/**
 * Purpose: Create new system prompt
 */
export const createSystemPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const orgId = Number(req.user!.org_id);
    const userId = Number(req.user!.id);

    const prompt = await service.create(orgId, userId, req.body);

    res.status(201).json({
      success: true,
      data: serializeBigInt(prompt)
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Purpose: Update system prompt
 */
export const updateSystemPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const promptId = Number(req.params.promptId);
    const orgId = Number(req.user!.org_id);
    const userId = Number(req.user!.id);

    const prompt = await service.update(promptId, orgId, userId, req.body);

    res.json({
      success: true,
      data: serializeBigInt(prompt)
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Purpose: Delete system prompt
 */
export const deleteSystemPrompt = async (req: Request, res: Response): Promise<void> => {
  try {
    const promptId = Number(req.params.promptId);
    const orgId = Number(req.user!.org_id);

    await service.delete(promptId, orgId);

    res.json({ success: true, message: 'System prompt deleted successfully' });
  } catch (error: any) {
    res.status(404).json({ success: false, error: error.message });
  }
};
