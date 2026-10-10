/**
 * Dashscope API adapter for Qwen models.
 * Directly calls Aliyun Dashscope API (HTTP-based LLM service).
 */
export declare const DASHSCOPE_API_ADAPTER_TYPE = "openai_compatible_api";
export declare const models: {
    id: string;
    label: string;
}[];
export declare const agentConfigurationDoc = "# openai_compatible_api Agent Configuration\n\nConfigure your agent to call any OpenAI-compatible LLM API (Dashscope/Qwen, DeepSeek, OpenRouter, Ollama, etc.).\n\n## Required Fields\n\n- **API Key**: Provider API key (starts with `sk-`, or use any string for keyless endpoints)\n- **Model**: Model ID as the provider lists it (e.g., `qwen-plus`, `deepseek-chat`, `llama3`)\n\n## Optional Fields\n\n- **Base URL**: OpenAI-compatible endpoint root (default: `https://dashscope.aliyuncs.com/compatible-mode/v1`)\n- **Timeout**: Request timeout in seconds (default: 120)\n\n## Example Providers\n\n| Provider | Base URL |\n|---|---|\n| Dashscope (Qwen) | `https://dashscope.aliyuncs.com/compatible-mode/v1` |\n| DeepSeek | `https://api.deepseek.com/v1` |\n| OpenRouter | `https://openrouter.ai/api/v1` |\n| Ollama (local) | `http://localhost:11434/v1` |\n";
export declare const DASHSCOPE_ADAPTER_METADATA: {
    label: string;
    description: string;
    recommendedFor: string;
    models: {
        id: string;
        label: string;
    }[];
    agentConfigurationDoc: string;
    supportsLocalAgentJwt: boolean;
};
//# sourceMappingURL=index.d.ts.map