import type { ServerAdapterModule, AdapterEnvironmentTestContext, AdapterEnvironmentTestResult } from "@paperclipai/adapter-utils";
import { execute } from "./execute.js";
declare function testEnvironment(_ctx: AdapterEnvironmentTestContext): Promise<AdapterEnvironmentTestResult>;
export declare const dashscopeServerAdapter: ServerAdapterModule;
export { execute };
export { testEnvironment };
export * from "./execute.js";
//# sourceMappingURL=index.d.ts.map