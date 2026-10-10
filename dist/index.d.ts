export default function createServerAdapterDefault(): any;
/**
 * OpenAI-compatible API adapter for DeepSeek, OpenRouter, Dashscope/Qwen,
 * Ollama, and other compatible chat-completions endpoints.
 */
export const DASHSCOPE_API_ADAPTER_TYPE: "openai_compatible_api";
export const models: {
    id: string;
    label: string;
}[];
export const agentConfigurationDoc: "# OpenAI-Compatible API Agent Configuration\n\nConfigure this agent to use any API compatible with OpenAI Chat Completions.\n\n## Required fields\n- **API Key**: API key from your provider. For local keyless endpoints, use a placeholder only if accepted by the endpoint.\n- **Model**: Exact model ID supplied by your provider.\n\n## Optional fields\n- **Base URL**: API root URL. DeepSeek: `https://api.deepseek.com`; OpenRouter: `https://openrouter.ai/api/v1`; Dashscope: `https://dashscope.aliyuncs.com/compatible-mode/v1`; Ollama: `http://localhost:11434/v1`.\n- **Timeout**: Request timeout in seconds (default: 120).\n- **Instructions**: System instructions for the agent.\n\nThe model should support tool/function calling for Paperclip tools to work.\n";
export namespace DASHSCOPE_ADAPTER_METADATA {
    export let label: string;
    export let description: string;
    export let recommendedFor: string;
    export { models };
    export { agentConfigurationDoc };
    export let supportsLocalAgentJwt: boolean;
}
export { execute } from "./server/execute.js";
