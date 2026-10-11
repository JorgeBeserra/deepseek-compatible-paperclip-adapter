import { DEEPSEEK_ADAPTER_TYPE } from "../constants.js";
import { agentConfigurationDoc, getConfigSchema, models, sessionCodec, } from "../definition.js";
import { execute } from "./execute.js";
import { listModels, refreshModels } from "./models.js";
function environmentResult(status, checks) {
    return {
        adapterType: DEEPSEEK_ADAPTER_TYPE,
        status,
        checks,
        testedAt: new Date().toISOString(),
    };
}
export async function testEnvironment(ctx) {
    const apiKey = typeof ctx.config.apiKey === "string" ? ctx.config.apiKey.trim() : "";
    const model = typeof ctx.config.model === "string" ? ctx.config.model.trim() : "";
    const baseUrl = typeof ctx.config.baseUrl === "string" && ctx.config.baseUrl.trim()
        ? ctx.config.baseUrl.trim().replace(/\/$/, "")
        : "https://api.deepseek.com";
    const checks = [];
    if (!apiKey) {
        checks.push({
            code: "deepseek_api_key_missing",
            level: "error",
            message: "DeepSeek API key is required",
            hint: "Enter an API key before testing this adapter.",
        });
    }
    if (!model) {
        checks.push({
            code: "deepseek_model_missing",
            level: "error",
            message: "A DeepSeek model must be selected",
        });
    }
    try {
        const parsedBaseUrl = new URL(baseUrl);
        if (!['http:', 'https:'].includes(parsedBaseUrl.protocol))
            throw new Error("unsupported protocol");
        if (parsedBaseUrl.username || parsedBaseUrl.password)
            throw new Error("credentials in URL are not allowed");
    }
    catch {
        checks.push({
            code: "deepseek_base_url_invalid",
            level: "error",
            message: "DeepSeek Base URL must be a valid HTTP or HTTPS URL",
        });
    }
    if (checks.length > 0)
        return environmentResult("fail", checks);
    const configuredTimeout = Number(ctx.config.timeoutSec);
    const timeoutSec = Number.isFinite(configuredTimeout) && configuredTimeout > 0
        ? Math.min(configuredTimeout, 30)
        : 15;
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutSec * 1000);
    try {
        const response = await fetch(`${baseUrl}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
        });
        if (!response.ok) {
            const authenticationFailure = response.status === 401 || response.status === 403;
            return environmentResult("fail", [{
                    code: authenticationFailure ? "deepseek_auth_failed" : "deepseek_api_failed",
                    level: "error",
                    message: authenticationFailure
                        ? `DeepSeek rejected the API key (HTTP ${response.status})`
                        : `DeepSeek model discovery failed (HTTP ${response.status})`,
                    hint: authenticationFailure
                        ? "Verify that the API key is correct and active."
                        : "Verify the Base URL and try again.",
                }]);
        }
        const payload = await response.json();
        const availableModelIds = Array.isArray(payload?.data)
            ? payload.data
                .map((entry) => typeof entry?.id === "string" ? entry.id : "")
                .filter(Boolean)
            : [];
        if (availableModelIds.length === 0) {
            return environmentResult("fail", [{
                    code: "deepseek_models_empty",
                    level: "error",
                    message: "DeepSeek authenticated successfully but returned no models",
                }]);
        }
        if (!availableModelIds.includes(model)) {
            return environmentResult("fail", [{
                    code: "deepseek_model_unavailable",
                    level: "error",
                    message: `Configured model '${model}' is not available for this API key`,
                    hint: `Available models: ${availableModelIds.join(", ")}`,
                }]);
        }
        return environmentResult("pass", [
            {
                code: "deepseek_auth_valid",
                level: "info",
                message: "Authenticated with the DeepSeek API",
            },
            {
                code: "deepseek_model_available",
                level: "info",
                message: `Model '${model}' is available`,
            },
        ]);
    }
    catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        return environmentResult("fail", [{
                code: timedOut ? "deepseek_api_timeout" : "deepseek_api_unreachable",
                level: "error",
                message: timedOut
                    ? `DeepSeek API test timed out after ${timeoutSec} seconds`
                    : "Could not connect to the DeepSeek API",
                detail: error instanceof Error ? error.message : String(error),
                hint: "Verify the Base URL and network access from the Paperclip server.",
            }]);
    }
    finally {
        clearTimeout(timeoutHandle);
    }
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
    supportsLocalAgentJwt: true,
};
export function createServerAdapter() {
    return deepseekServerAdapter;
}
/** @deprecated Use deepseekServerAdapter. */
export const dashscopeServerAdapter = deepseekServerAdapter;
export { execute };
export { listModels, refreshModels };
export * from "./execute.js";
//# sourceMappingURL=index.js.map