/** DeepSeek adapter for Paperclip using DeepSeek's OpenAI-compatible API. */
import { DEEPSEEK_ADAPTER_TYPE } from "./constants.js";
import { createServerAdapter } from "./server/index.js";
export { DEEPSEEK_ADAPTER_TYPE, LEGACY_OPENAI_COMPATIBLE_ADAPTER_TYPE, DASHSCOPE_API_ADAPTER_TYPE, } from "./constants.js";
export const type = DEEPSEEK_ADAPTER_TYPE;
export { label, models, agentConfigurationDoc, sessionCodec, getConfigSchema, DEEPSEEK_ADAPTER_METADATA, DASHSCOPE_ADAPTER_METADATA, } from "./definition.js";
export { createServerAdapter };
export { execute } from "./server/execute.js";
export default createServerAdapter;
//# sourceMappingURL=index.js.map