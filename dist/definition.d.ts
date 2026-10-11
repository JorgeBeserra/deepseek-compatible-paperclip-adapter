export declare const label = "DeepSeek";
export declare const models: {
    id: string;
    label: string;
}[];
export declare const agentConfigurationDoc = "# DeepSeek Agent Configuration\n\nConfigure this Paperclip agent to use the DeepSeek API.\n\n## Required fields\n- **API Key**: Your DeepSeek API key.\n- **Model**: DeepSeek model ID, such as `deepseek-flash` or `deepseek-v4-pro`.\n\n## Optional fields\n- **Base URL**: DeepSeek API root (default: `https://api.deepseek.com`).\n- **Timeout**: Request timeout in seconds (default: 120).\n- **Instructions**: System instructions for the agent.\n\nThe model should support tool/function calling for Paperclip tools to work.\n";
export declare const sessionCodec: {
    deserialize(raw: any): {
        sessionId: any;
    } | null;
    serialize(params: any): {
        sessionId: any;
    } | null;
    getDisplayId(params: any): string | null;
};
export declare function getConfigSchema(): {
    fields: ({
        key: string;
        label: string;
        type: string;
        required: boolean;
        options?: undefined;
        default?: undefined;
    } | {
        key: string;
        label: string;
        type: string;
        required: boolean;
        default: string;
        options?: undefined;
    } | {
        key: string;
        label: string;
        type: string;
        required: boolean;
        default: string;
        options: {
            value: string;
            label: string;
        }[];
    } | {
        required?: undefined;
        options?: undefined;
        key: string;
        label: string;
        type: string;
        default: number;
    } | {
        required?: undefined;
        options?: undefined;
        default?: undefined;
        key: string;
        label: string;
        type: string;
    })[];
};
export declare const DEEPSEEK_ADAPTER_METADATA: {
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
/** @deprecated Use DEEPSEEK_ADAPTER_METADATA. */
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
//# sourceMappingURL=definition.d.ts.map