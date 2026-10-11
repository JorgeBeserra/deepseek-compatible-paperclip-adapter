import { DEEPSEEK_ADAPTER_TYPE } from "../constants.js";
import { execute } from "./execute.js";

async function testEnvironment(_ctx) {
    return {
        adapterType: DEEPSEEK_ADAPTER_TYPE,
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

export const deepseekServerAdapter = {
    type: DEEPSEEK_ADAPTER_TYPE,
    execute,
    testEnvironment,
};

export function createServerAdapter() {
    return deepseekServerAdapter;
}

/** @deprecated Use deepseekServerAdapter. */
export const dashscopeServerAdapter = deepseekServerAdapter;

export { execute };
export { testEnvironment };
export * from "./execute.js";
