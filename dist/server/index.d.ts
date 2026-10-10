export function createServerAdapter(): {
    type: string;
    execute: typeof execute;
    testEnvironment: typeof testEnvironment;
};
export namespace dashscopeServerAdapter {
    export { DASHSCOPE_API_ADAPTER_TYPE as type };
    export { execute };
    export { testEnvironment };
}
export * from "./execute.js";
import { execute } from "./execute.js";
export function testEnvironment(_ctx: any): Promise<{
    adapterType: string;
    status: string;
    checks: {
        code: string;
        level: string;
        message: string;
    }[];
    testedAt: string;
}>;
import { DASHSCOPE_API_ADAPTER_TYPE } from "../index.js";
export { execute };
