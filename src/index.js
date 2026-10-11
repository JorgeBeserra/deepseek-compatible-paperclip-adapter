/**
 * OpenAI-compatible API adapter for DeepSeek, OpenRouter, Dashscope/Qwen,
 * Ollama, and other compatible chat-completions endpoints.
 */
import { createServerAdapter } from "./server/index.js";

export { DASHSCOPE_API_ADAPTER_TYPE } from "./constants.js";

export const models = [
    { id: "deepseek-chat", label: "DeepSeek Chat" },
    { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    { id: "qwen-plus", label: "Qwen Plus" },
    { id: "qwen3.5-plus", label: "Qwen 3.5 Plus" },
    { id: "qwen-turbo", label: "Qwen Turbo" },
    { id: "qwen-max", label: "Qwen Max" },
];

export const agentConfigurationDoc = `# OpenAI-Compatible API Agent Configuration

Configure this agent to use any API compatible with OpenAI Chat Completions.

## Required fields
- **API Key**: API key from your provider. For local keyless endpoints, use a placeholder only if accepted by the endpoint.
- **Model**: Exact model ID supplied by your provider.

## Optional fields
- **Base URL**: API root URL. DeepSeek: \`https://api.deepseek.com\`; OpenRouter: \`https://openrouter.ai/api/v1\`; Dashscope: \`https://dashscope.aliyuncs.com/compatible-mode/v1\`; Ollama: \`http://localhost:11434/v1\`.
- **Timeout**: Request timeout in seconds (default: 120).
- **Instructions**: System instructions for the agent.

The model should support tool/function calling for Paperclip tools to work.
`;

export const DASHSCOPE_ADAPTER_METADATA = {
    label: "DeepSeek",
    description: "Connect DeepSeek models to Paperclip using the OpenAI-compatible API",
    recommendedFor: "DeepSeek Chat and DeepSeek Reasoner",
    models,
    agentConfigurationDoc,
    supportsLocalAgentJwt: false,
};

export { createServerAdapter };
export { execute } from "./server/execute.js";

export const sessionCodec = {
    deserialize(raw) {
        if (!raw || typeof raw !== "object")
            return null;
        const r = raw;
        const id = typeof r.sessionId === "string" ? r.sessionId : null;
        if (!id)
            return null;
        return { sessionId: id };
    },
    serialize(params) {
        if (!params)
            return null;
        const id = typeof params.sessionId === "string" ? params.sessionId : null;
        return id ? { sessionId: id } : null;
    },
    getDisplayId(params) {
        if (!params)
            return null;
        const id = typeof params.sessionId === "string" ? params.sessionId : null;
        return id ? `session:${id.slice(0, 8)}` : null;
    },
};

export function getConfigSchema() {
    return {
        fields: [
            { key: "apiKey", label: "API Key", type: "text", required: true },
            { key: "baseUrl", label: "Base URL", type: "text", required: false, default: "https://api.deepseek.com" },
            { key: "model", label: "Model", type: "combobox", required: true, default: "deepseek-chat",
              options: models.map(m => ({ value: m.id, label: m.label })) },
            { key: "timeoutSec", label: "Timeout (seconds)", type: "number", default: 120 },
            { key: "instructions", label: "Instructions", type: "textarea" }
        ]
    };
}

export default createServerAdapter;
