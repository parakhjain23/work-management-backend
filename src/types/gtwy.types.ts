import z from 'zod';

export const ServiceSchema = z.enum(['openai_response', 'groq', 'anthropic']);
export type Service = z.infer<typeof ServiceSchema>;

export const GroqModelSchema = z.enum([
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'llama3-groq-70b-8192-tool-use-preview',
    'llama3-groq-8b-8192-tool-use-preview',
    'llama3-70b-8192',
    'llama3-8b-8192',
    'mixtral-8x7b-32768',
    'gemma-7b-it',
    'gemma2-9b-it',
]);
export type GroqModel = z.infer<typeof GroqModelSchema>;

export const OpenAIModelSchema = z.enum([
    'gpt-5',
    'gpt-5-medium',
    'gpt-5-mini',
    'gpt-5-mini-high',
    'gpt-5-nano',
    'gpt-4.1',
    'gpt-4o',
    'gpt-4.1-nano',
    'gpt-4.1-mini',
    'gpt-4o-mini',
    'gpt-4o-search-preview',
    'gpt-4o-mini-search-preview',
]);
export type OpenAIModel = z.infer<typeof OpenAIModelSchema>;

export const AnthropicModelSchema = z.enum([
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
    'claude-3-sonnet-20240229',
    'claude-3-opus-latest',
    'claude-3-opus-20240229',
    'claude-3-5-sonnet-latest',
    'claude-3-7-sonnet-latest',
]);
export type AnthropicModel = z.infer<typeof AnthropicModelSchema>;

export const ModelSchema = z.discriminatedUnion('service', [
    z.object({
        service: z.literal('openai'),
        model: OpenAIModelSchema,
    }),
    z.object({
        service: z.literal('openai_response'),
        model: OpenAIModelSchema,
    }),
    z.object({
        service: z.literal('anthropic'),
        model: AnthropicModelSchema,
    }),
    z.object({
        service: z.literal('groq'),
        model: GroqModelSchema,
    }),
]);
export type Model = z.infer<typeof ModelSchema>;

export const OPENAI_MODELS = {
    gpt_5: 'gpt-5',
    gpt_5_medium: 'gpt-5-medium',
    gpt_5_mini: 'gpt-5-mini',
    gpt_5_mini_high: 'gpt-5-mini-high',
    gpt_5_nano: 'gpt-5-nano',
    gpt_4_1: 'gpt-4.1',
    gpt_4o: 'gpt-4o',
    gpt_4_1_nano: 'gpt-4.1-nano',
    gpt_4_1_mini: 'gpt-4.1-mini',
    gpt_4o_mini: 'gpt-4o-mini',
    gpt_4o_search_preview: 'gpt-4o-search-preview',
    gpt_4o_mini_search_preview: 'gpt-4o-mini-search-preview',
}

export const GTWY_AGENT = {
    work_item_detection: '697e000d67da81ed84b1e381',
    system_prompt_condition_generator: '698097524364fa8152ccd830'
}