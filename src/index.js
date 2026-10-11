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
    label: "OpenAI-Compatible API",
    description: "Connect to DeepSeek and other OpenAI-compatible chat-completions APIs",
    recommendedFor: "DeepSeek, OpenRouter, Dashscope/Qwen, Ollama, and compatible providers",
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
    // Ensure we have at least the curated defaults for the UI
    const modelOptions = models.length > 0
        ? models.map((m) => ({ value: m.id, label: m.label }))
        : [
            { value: "deepseek/deepseek-chat-v3-0324:free", label: "DeepSeek V3 0324 (free)" },
            { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6 (paid)" },
            { value: "openai/gpt-4o", label: "GPT-4o (paid)" },
        ];
    return {
        fields: [
            {
                key: "apiKey",
                label: "OpenRouter API Key",
                type: "text",
                required: true,
                hint: "Get one at https://openrouter.ai/keys. Store as a Paperclip secret in production.",
            },
            {
                key: "model",
                label: "Model",
                type: "combobox",
                default: DEFAULT_MODEL,
                options: modelOptions,
                hint: "OpenRouter model id. 370+ models available after initialization.",
            },
            {
                key: "temperature",
                label: "Temperature",
                type: "number",
                default: 0.2,
            },
            {
                key: "maxTokens",
                label: "Max output tokens",
                type: "number",
                hint: "Leave blank to use the model's default.",
            },
            {
                key: "systemPrompt",
                label: "System prompt",
                type: "textarea",
                hint: "Optional override of the built-in system prompt.",
            },
        ],
    };

export function createServerAdapter() {
    const schema = getConfigSchema();
    return {
        type: ADAPTER_TYPE,
        execute,
        testEnvironment,
        listModels,
        refreshModels: listModels,
        sessionCodec,
        models,
        agentConfigurationDoc,
        getConfigSchema,
        configSchema: schema,
        supportsInstructionsBundle: false,
    };
}

export default createServerAdapter;
