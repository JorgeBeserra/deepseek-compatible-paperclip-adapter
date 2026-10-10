export function execute(ctx: any): Promise<{
    exitCode: number;
    signal: any;
    timedOut: boolean;
    errorMessage: string;
    usage?: undefined;
    model?: undefined;
    provider?: undefined;
    costUsd?: undefined;
    summary?: undefined;
} | {
    exitCode: number;
    signal: any;
    timedOut: boolean;
    usage: {
        inputTokens: number;
        outputTokens: number;
    };
    model: string;
    provider: string;
    costUsd: number;
    summary: string;
    errorMessage?: undefined;
}>;
