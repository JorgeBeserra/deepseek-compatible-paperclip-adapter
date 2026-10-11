export function buildConfig(formValues) {
    const formObj = formValues;
    const parsedTimeoutSec = Number(formObj.timeoutSec);
    return {
        apiKey: formObj.apiKey || "",
        model: formObj.model || "deepseek-flash",
        baseUrl: formObj.baseUrl || "https://api.deepseek.com",
        timeoutSec: Number.isFinite(parsedTimeoutSec) && parsedTimeoutSec > 0 ? parsedTimeoutSec : 120,
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
