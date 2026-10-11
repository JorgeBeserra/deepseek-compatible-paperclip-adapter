const DEFAULT_BASE_URL = "https://api.deepseek.com";
function readAmount(value) {
    return typeof value === "string" && value.trim() ? value.trim() : "0.00";
}
function balanceWindow(info, isAvailable) {
    const currency = typeof info.currency === "string" && info.currency.trim()
        ? info.currency.trim().toUpperCase()
        : "UNKNOWN";
    const total = readAmount(info.total_balance);
    const granted = readAmount(info.granted_balance);
    const toppedUp = readAmount(info.topped_up_balance);
    return {
        label: `DeepSeek balance (${currency})`,
        usedPercent: null,
        resetsAt: null,
        valueLabel: `${currency} ${total} remaining`,
        detail: `Granted: ${currency} ${granted} · Topped up: ${currency} ${toppedUp} · API calls: ${isAvailable ? "available" : "unavailable"}`,
    };
}
export async function fetchDeepSeekBalance({ apiKey, baseUrl = DEFAULT_BASE_URL, timeoutMs = 10_000 } = {}) {
    const key = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!key) {
        return {
            provider: "deepseek",
            source: "DeepSeek API /user/balance",
            ok: false,
            error: "DEEPSEEK_API_KEY is not configured in the Paperclip server environment",
            windows: [],
        };
    }
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, "")}/user/balance`, {
            headers: {
                Authorization: `Bearer ${key}`,
                Accept: "application/json",
            },
            signal: controller.signal,
        });
        if (!response.ok) {
            const authenticationFailure = response.status === 401 || response.status === 403;
            return {
                provider: "deepseek",
                source: "DeepSeek API /user/balance",
                ok: false,
                error: authenticationFailure
                    ? `DeepSeek rejected the balance API key (HTTP ${response.status})`
                    : `DeepSeek balance request failed (HTTP ${response.status})`,
                windows: [],
            };
        }
        const payload = await response.json();
        const balanceInfos = Array.isArray(payload?.balance_infos)
            ? payload.balance_infos.filter((info) => info && typeof info === "object")
            : [];
        if (balanceInfos.length === 0) {
            return {
                provider: "deepseek",
                source: "DeepSeek API /user/balance",
                ok: false,
                error: "DeepSeek returned no balance entries",
                windows: [],
            };
        }
        const isAvailable = payload?.is_available === true;
        return {
            provider: "deepseek",
            source: "DeepSeek API /user/balance",
            ok: true,
            windows: balanceInfos.map((info) => balanceWindow(info, isAvailable)),
        };
    }
    catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";
        return {
            provider: "deepseek",
            source: "DeepSeek API /user/balance",
            ok: false,
            error: timedOut
                ? `DeepSeek balance request timed out after ${timeoutMs}ms`
                : `Could not retrieve DeepSeek balance: ${error instanceof Error ? error.message : String(error)}`,
            windows: [],
        };
    }
    finally {
        clearTimeout(timeoutHandle);
    }
}
//# sourceMappingURL=quota.js.map