/** DeepSeek adapter for Paperclip using DeepSeek's OpenAI-compatible API. */
import { createServerAdapter } from "./server/index.js";

export {
    DEEPSEEK_ADAPTER_TYPE,
    DASHSCOPE_API_ADAPTER_TYPE,
} from "./constants.js";

export const models = [
    { id: "deepseek-chat", label: "DeepSeek Chat" },
    { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
];

export const agentConfigurationDoc = `# DeepSeek Agent Configuration

Configure this Paperclip agent to use the DeepSeek API.

## Required fields
- **API Key**: Your DeepSeek API key.
- **Model**: DeepSeek model ID, such as \`deepseek-chat\` or \`deepseek-reasoner\`.

## Optional fields
- **Base URL**: DeepSeek API root (default: \`https://api.deepseek.com\`).
- **Timeout**: Request timeout in seconds (default: 120).
- **Instructions**: System instructions for the agent.

The model should support tool/function calling for Paperclip tools to work.
`;

export const DEEPSEEK_ADAPTER_METADATA = {
    label: "DeepSeek",
    description: "Connect DeepSeek models to Paperclip using the OpenAI-compatible API",
    recommendedFor: "DeepSeek Chat and DeepSeek Reasoner",
    models,
    agentConfigurationDoc,
    supportsLocalAgentJwt: false,
};

/** @deprecated Use DEEPSEEK_ADAPTER_METADATA. */
export const DASHSCOPE_ADAPTER_METADATA = DEEPSEEK_ADAPTER_METADATA;

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
