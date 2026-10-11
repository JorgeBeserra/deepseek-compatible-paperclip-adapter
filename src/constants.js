/** Shared adapter constants. Keep this module dependency-free to avoid circular imports. */
export const DEEPSEEK_ADAPTER_TYPE = "openai_compatible_api";

/**
 * @deprecated Use DEEPSEEK_ADAPTER_TYPE. Kept as a compatibility alias for
 * existing Paperclip installations and consumers of earlier package versions.
 */
export const DASHSCOPE_API_ADAPTER_TYPE = DEEPSEEK_ADAPTER_TYPE;
