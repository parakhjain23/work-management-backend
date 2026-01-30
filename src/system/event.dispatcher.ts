import { getPrismaClient } from '../db/prisma.js';

export interface EventMatch {
  eventId: bigint;
  ruleId: bigint;
  promptId: bigint;
  eventType: string;
  entityType: string;
  entityId?: bigint;
}

export class EventDispatcher {
  public async findMatchingRules(event: {
    entity_type: string;
    action: string;
    entity_id?: number | bigint;
  }): Promise<EventMatch[]> {
    const prisma = getPrismaClient();
    
    try {
      const rules = await prisma.$queryRawUnsafe<any[]>(`
        SELECT 
          spr.id as rule_id,
          spr.system_prompt_id as prompt_id,
          spr.event_type,
          spr.entity_type,
          spr.priority
        FROM system_prompt_rules spr
        JOIN system_prompts sp ON sp.id = spr.system_prompt_id
        WHERE spr.event_type = '${event.action}'
          AND spr.entity_type = '${event.entity_type}'
          AND spr.is_active = true
          AND sp.is_active = true
        ORDER BY spr.priority ASC
        LIMIT 10
      `);

      return rules.map(rule => ({
        eventId: BigInt(0),
        ruleId: BigInt(rule.rule_id),
        promptId: BigInt(rule.prompt_id),
        eventType: rule.event_type,
        entityType: rule.entity_type,
        entityId: event.entity_id ? BigInt(event.entity_id) : undefined
      }));
    } catch (error) {
      console.error('Error finding matching rules:', error);
      return [];
    }
  }

  public async getSystemPrompt(promptId: bigint): Promise<string | null> {
    const prisma = getPrismaClient();
    
    try {
      const result = await prisma.$queryRawUnsafe<any[]>(`
        SELECT prompt_text
        FROM system_prompts
        WHERE id = ${promptId}
          AND is_active = true
        LIMIT 1
      `);

      return result.length > 0 ? result[0].prompt_text : null;
    } catch (error) {
      console.error('Error fetching system prompt:', error);
      return null;
    }
  }
}
