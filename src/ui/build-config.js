export function buildConfig(formValues) {
    const formObj = formValues;
    return {
        apiKey: formObj.apiKey || "",
        model: formObj.model || "qwen-plus",
        baseUrl: formObj.baseUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1",
        timeoutSec: formObj.timeoutSec ? parseInt(formObj.timeoutSec, 10) : 120,
        instructions: formObj.instructions || "",
        substackEmail: formObj.substackEmail || "",
        substackPassword: formObj.substackPassword || "",
        substackPublication: formObj.substackPublication || "newworldvalue",
        xApiKey: formObj.xApiKey || "",
        xApiSecret: formObj.xApiSecret || "",
        xAccessToken: formObj.xAccessToken || "",
        xAccessTokenSecret: formObj.xAccessTokenSecret || "",
        skillDocs: formObj.skillDocs ?? [],
        skillSecrets: formObj.skillSecrets ?? {},
    };
}
//# sourceMappingURL=build-config.js.map