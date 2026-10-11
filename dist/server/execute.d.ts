export declare function normalizeTimeoutSec(value: any, fallback?: number): number;
export declare function execute(ctx: any): Promise<{
    exitCode: number;
    signal: null;
    timedOut: boolean;
    errorMessage: string;
    errorCode?: undefined;
    usage?: undefined;
    model?: undefined;
    provider?: undefined;
    costUsd?: undefined;
    summary?: undefined;
} | {
    exitCode: number;
    signal: null;
    timedOut: boolean;
    errorCode: string;
    errorMessage: string;
    usage?: undefined;
    model?: undefined;
    provider?: undefined;
    costUsd?: undefined;
    summary?: undefined;
} | {
    errorCode?: undefined;
    errorMessage?: undefined;
    exitCode: number;
    signal: null;
    timedOut: boolean;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    model: string;
    provider: string;
    costUsd: number;
    summary: string;
}>;
//# sourceMappingURL=execute.d.ts.map