import { models as fallbackModels } from "../definition.js";
let discoveredModels = fallbackModels;
function modelLabel(model) {
    if (typeof model.name === "string" && model.name.trim())
        return model.name.trim();
    return model.id;
}
export async function refreshModels() {
    const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
    if (!apiKey)
        return discoveredModels;
    const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, "");
    try {
        const response = await fetch(`${baseUrl}/models`, {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok)
            return discoveredModels;
        const payload = await response.json();
        const seen = new Set();
        const available = Array.isArray(payload?.data)
            ? payload.data
                .filter((model) => model && typeof model.id === "string" && model.id.trim())
                .map((model) => ({ id: model.id.trim(), label: modelLabel(model) }))
                .filter((model) => !seen.has(model.id) && seen.add(model.id))
            : [];
        if (available.length > 0)
            discoveredModels = available;
    }
    catch {
        // Keep the last known catalog so a temporary provider outage never
        // leaves Paperclip's model picker empty.
    }
    return discoveredModels;
}
export async function listModels() {
    return discoveredModels;
}
//# sourceMappingURL=models.js.map