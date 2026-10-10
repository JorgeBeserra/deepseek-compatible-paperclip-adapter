/**
 * Dashscope API adapter for Qwen models.
 * Directly calls Aliyun Dashscope API (HTTP-based LLM service).
 */
export const DASHSCOPE_API_ADAPTER_TYPE = "openai_compatible_api";
export const models = [
    { id: "qwen-plus", label: "Qwen Plus" },
    { id: "qwen3.5-plus", label: "Qwen 3.5 Plus" },
    { id: "qwen-turbo", label: "Qwen Turbo" },
    { id: "qwen-max", label: "Qwen Max" },
];
export const agentConfigurationDoc = `# openai_compatible_api Agent Configuration

Configure your agent to call any OpenAI-compatible LLM API (Dashscope/Qwen, DeepSeek, OpenRouter, Ollama, etc.).

## Required Fields

- **API Key**: Provider API key (starts with \`sk-\`, or use any string for keyless endpoints)
- **Model**: Model ID as the provider lists it (e.g., \`qwen-plus\`, \`deepseek-chat\`, \`llama3\`)

## Optional Fields

- **Base URL**: OpenAI-compatible endpoint root (default: \`https://dashscope.aliyuncs.com/compatible-mode/v1\`)
- **Timeout**: Request timeout in seconds (default: 120)

## Example Providers

| Provider | Base URL |
|---|---|
| Dashscope (Qwen) | \`https://dashscope.aliyuncs.com/compatible-mode/v1\` |
| DeepSeek | \`https://api.deepseek.com/v1\` |
| OpenRouter | \`https://openrouter.ai/api/v1\` |
| Ollama (local) | \`http://localhost:11434/v1\` |
`;
export const DASHSCOPE_ADAPTER_METADATA = {
    label: "Dashscope API (Qwen)",
    description: "Call Qwen models via Aliyun Dashscope HTTP API (requires API key)",
    recommendedFor: "Quick testing with Dashscope Qwen models",
    models,
    agentConfigurationDoc,
    supportsLocalAgentJwt: false,
};

export { createServerAdapter } from "./server/index.js";
export { execute } from "./server/execute.js";

export default function createServerAdapterDefault() {
    return createServerAdapter();
}


//# sourceMappingURL=index.js.map