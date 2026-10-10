/**
 * OpenAI-compatible API adapter for DeepSeek, OpenRouter, Dashscope/Qwen,
 * Ollama, and other compatible chat-completions endpoints.
 */
export const DASHSCOPE_API_ADAPTER_TYPE = "openai_compatible_api";

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

export { createServerAdapter } from "./server/index.js";
export { execute } from "./server/execute.js";

export default function createServerAdapterDefault() {
    return createServerAdapter();
}
