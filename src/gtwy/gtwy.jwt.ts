import axios from 'axios';
import { AnthropicModel, GroqModel, GTWY_AGENT, ModelSchema, OpenAIModel, Service } from "../types/gtwy.types";

class GtwyService {
    private authKey: string;
    private rtlayer: boolean;
    private agentId?: string;
    private responseType?: string;
    private model?: string;
    private service?: string;

    constructor(
        authKey: string,
        agentId?: string,
        responseType?: string,
        model?: string,
        service?: string,
        rtlayer: boolean = false,
    ) {
        this.authKey = authKey;
        this.rtlayer = rtlayer;
        this.agentId = agentId;
        this.responseType = responseType;
        this.model = model;
        this.service = service;
    }

    async sendMessage({ message, threadId, variables }: { message: string, threadId?: string, variables?: Record<string, any> }) {
        try {
            const response = await axios.post(
                'https://api.gtwy.ai/api/v2/model/chat/completion',
                {
                    user: message,
                    agent_id: this.agentId,
                    thread_id: threadId,
                    response_type: this.responseType,
                    variables: {
                        ...variables,
                        environment: process.env.NODE_ENV,
                    },
                    RTLayer: this.rtlayer,
                    service: this.service,
                    apikey: this.authKey,
                },
                {
                    headers: {
                        pauthkey: this.authKey,
                        'Content-Type': 'application/json',
                    }
                }
            );
            return response.data?.response?.data?.content || null;
        } catch (error: any) {
            console.error('[GtwyService] sendMessage error:', error?.response?.data || error?.message);
            throw new Error(error?.response?.data?.error || error?.message);
        }
    }
}

export class GtwyServiceBuilder {
    private authKey: string;
    private rtlayer: boolean;
    private agentId?: string;
    private responseType: string;
    private model?: string;
    private service: Service;

    constructor() {
        this.authKey = process.env.GTWY_AUTH_KEY || '';
        this.rtlayer = false;
        this.agentId = GTWY_AGENT.work_item_detection;
        this.responseType = 'text';
        this.model = undefined;
        this.service = 'openai_response';
    }
    useService(service: Service, model: OpenAIModel | GroqModel | AnthropicModel) {
        if (!service || !model) return this;
        this.service = service;
        this.model = model;
        return this;
    }
    useOpenAI(model: OpenAIModel) {
        this.service = 'openai_response';
        this.model = model;
        return this;
    }
    useGroq(model: GroqModel) {
        this.service = 'groq';
        this.model = model;
        return this;
    }
    useAnthropic(model: AnthropicModel) {
        this.service = 'anthropic';
        this.model = model;
        return this;
    }
    useRTLayer(rtlayer: boolean) {
        this.rtlayer = rtlayer;
        return this;
    }
    useAgent(agentId: string) {
        this.agentId = agentId;
        return this;
    }
    useResponseType(responseType: string) {
        this.responseType = responseType;
        return this;
    }

    build() {
        return new GtwyService(
            this.authKey,
            this.agentId,
            this.responseType,
            this.model,
            this.service,
            this.rtlayer
        );
    }
}