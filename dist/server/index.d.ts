import { execute } from "./execute.js";
declare function testEnvironment(_ctx: any): Promise<{
    adapterType: string;
    status: string;
    checks: {
        code: string;
        level: string;
        message: string;
    }[];
    testedAt: string;
}>;
export declare const deepseekServerAdapter: {
    type: string;
    execute: typeof execute;
    testEnvironment: typeof testEnvironment;
};
export declare function createServerAdapter(): {
    type: string;
    execute: typeof execute;
    testEnvironment: typeof testEnvironment;
};
/** @deprecated Use deepseekServerAdapter. */
export declare const dashscopeServerAdapter: {
    type: string;
    execute: typeof execute;
    testEnvironment: typeof testEnvironment;
};
export { execute };
export { testEnvironment };
export * from "./execute.js";
//# sourceMappingURL=index.d.ts.map