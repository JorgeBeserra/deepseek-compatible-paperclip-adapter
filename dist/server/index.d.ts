import { getConfigSchema } from "../definition.js";
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
    models: {
        id: string;
        label: string;
    }[];
    agentConfigurationDoc: string;
    sessionCodec: {
        deserialize(raw: any): {
            sessionId: any;
        } | null;
        serialize(params: any): {
            sessionId: any;
        } | null;
        getDisplayId(params: any): string | null;
    };
    getConfigSchema: typeof getConfigSchema;
    supportsLocalAgentJwt: boolean;
};
export declare function createServerAdapter(): {
    type: string;
    execute: typeof execute;
    testEnvironment: typeof testEnvironment;
    models: {
        id: string;
        label: string;
    }[];
    agentConfigurationDoc: string;
    sessionCodec: {
        deserialize(raw: any): {
            sessionId: any;
        } | null;
        serialize(params: any): {
            sessionId: any;
        } | null;
        getDisplayId(params: any): string | null;
    };
    getConfigSchema: typeof getConfigSchema;
    supportsLocalAgentJwt: boolean;
};
/** @deprecated Use deepseekServerAdapter. */
export declare const dashscopeServerAdapter: {
    type: string;
    execute: typeof execute;
    testEnvironment: typeof testEnvironment;
    models: {
        id: string;
        label: string;
    }[];
    agentConfigurationDoc: string;
    sessionCodec: {
        deserialize(raw: any): {
            sessionId: any;
        } | null;
        serialize(params: any): {
            sessionId: any;
        } | null;
        getDisplayId(params: any): string | null;
    };
    getConfigSchema: typeof getConfigSchema;
    supportsLocalAgentJwt: boolean;
};
export { execute };
export { testEnvironment };
export * from "./execute.js";
//# sourceMappingURL=index.d.ts.map