export function buildConfig(formValues) {
    const formObj = formValues;
    return {
        apiKey: formObj.apiKey || "",
        model: formObj.model || "deepseek-flash",
        baseUrl: formObj.baseUrl || "https://api.deepseek.com",
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
