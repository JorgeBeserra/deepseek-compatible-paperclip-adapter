/** Shared adapter constants. Keep this module dependency-free to avoid circular imports. */
// Paperclip currently derives external-adapter titles from `type` and ignores
// the exported label. camelCase preserves the official “DeepSeek” spelling in
// its UI humanizer while remaining a valid external adapter type.
export const DEEPSEEK_ADAPTER_TYPE = "deepSeek";
export const LEGACY_OPENAI_COMPATIBLE_ADAPTER_TYPE = "openai_compatible_api";

/**
 * @deprecated Use DEEPSEEK_ADAPTER_TYPE. Kept as a compatibility alias for
 * existing Paperclip installations and consumers of earlier package versions.
 */
export const DASHSCOPE_API_ADAPTER_TYPE = LEGACY_OPENAI_COMPATIBLE_ADAPTER_TYPE;
