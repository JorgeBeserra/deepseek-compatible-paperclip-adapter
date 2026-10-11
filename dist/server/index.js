import { DEEPSEEK_ADAPTER_TYPE } from "../constants.js";
import { agentConfigurationDoc, getConfigSchema, models, sessionCodec, } from "../definition.js";
import { execute } from "./execute.js";
import { listModels, refreshModels } from "./models.js";
async function testEnvironment(_ctx) {
    return {
        adapterType: DEEPSEEK_ADAPTER_TYPE,
        status: "pass",
        checks: [
            {
                code: "deepseek_ready",
                level: "info",
                message: "OpenAI-compatible adapter ready — no local environment required",
            },
        ],
        testedAt: new Date().toISOString(),
    };
}
export const deepseekServerAdapter = {
    type: DEEPSEEK_ADAPTER_TYPE,
    execute,
    testEnvironment,
    models,
    listModels,
    refreshModels,
    agentConfigurationDoc,
    sessionCodec,
    getConfigSchema,
    supportsLocalAgentJwt: false,
};
export function createServerAdapter() {
    return deepseekServerAdapter;
}
/** @deprecated Use deepseekServerAdapter. */
export const dashscopeServerAdapter = deepseekServerAdapter;
export { execute };
export { testEnvironment };
export { listModels, refreshModels };
export * from "./execute.js";
//# sourceMappingURL=index.js.map