export declare function fetchDeepSeekBalance({ apiKey, baseUrl, timeoutMs }?: {
    baseUrl?: string | undefined;
    timeoutMs?: number | undefined;
}): Promise<{
    provider: string;
    source: string;
    ok: boolean;
    error: string;
    windows: never[];
} | {
    error?: undefined;
    provider: string;
    source: string;
    ok: boolean;
    windows: any;
}>;
//# sourceMappingURL=quota.d.ts.map