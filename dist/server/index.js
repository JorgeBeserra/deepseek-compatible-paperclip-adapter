import { DASHSCOPE_API_ADAPTER_TYPE } from "../index.js";
import { execute } from "./execute.js";
async function testEnvironment(_ctx) {
    return {
        adapterType: DASHSCOPE_API_ADAPTER_TYPE,
        status: "pass",
        checks: [
            {
                code: "openai_compatible_api_ready",
                level: "info",
                message: "OpenAI-compatible adapter ready — no local environment required",
            },
        ],
        testedAt: new Date().toISOString(),
    };
}
export const dashscopeServerAdapter = {
    type: DASHSCOPE_API_ADAPTER_TYPE,
    execute,
    testEnvironment,
};
export function createServerAdapter() {
    return dashscopeServerAdapter;
}
export { execute };
export { testEnvironment };
export * from "./execute.js";
//# sourceMappingURL=index.js.map
