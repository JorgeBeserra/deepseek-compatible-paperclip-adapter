import assert from "node:assert/strict";
import test from "node:test";

import adapterFactory, {
    DASHSCOPE_ADAPTER_METADATA,
    DASHSCOPE_API_ADAPTER_TYPE,
    DEEPSEEK_ADAPTER_METADATA,
    DEEPSEEK_ADAPTER_TYPE,
    createServerAdapter,
    getConfigSchema,
    models,
} from "../dist/index.js";
import {
    dashscopeServerAdapter,
    deepseekServerAdapter,
} from "../dist/server/index.js";
import { buildConfig } from "../dist/ui/index.js";

test("exports the DeepSeek adapter contract expected by Paperclip", () => {
    assert.equal(DEEPSEEK_ADAPTER_TYPE, "openai_compatible_api");
    assert.equal(adapterFactory, createServerAdapter);

    const adapter = createServerAdapter();
    assert.equal(adapter, deepseekServerAdapter);
    assert.equal(adapter.type, DEEPSEEK_ADAPTER_TYPE);
    assert.equal(typeof adapter.execute, "function");
    assert.equal(typeof adapter.testEnvironment, "function");
});

test("keeps legacy named exports as compatibility aliases", () => {
    assert.equal(DASHSCOPE_API_ADAPTER_TYPE, DEEPSEEK_ADAPTER_TYPE);
    assert.equal(DASHSCOPE_ADAPTER_METADATA, DEEPSEEK_ADAPTER_METADATA);
    assert.equal(dashscopeServerAdapter, deepseekServerAdapter);
});

test("uses DeepSeek names and defaults throughout public configuration", () => {
    assert.deepEqual(models, [
        { id: "deepseek-chat", label: "DeepSeek Chat" },
        { id: "deepseek-reasoner", label: "DeepSeek Reasoner" },
    ]);
    assert.equal(DEEPSEEK_ADAPTER_METADATA.label, "DeepSeek");
    assert.match(DEEPSEEK_ADAPTER_METADATA.description, /DeepSeek/);

    const fields = Object.fromEntries(
        getConfigSchema().fields.map((field) => [field.key, field]),
    );
    assert.equal(fields.model.default, "deepseek-chat");
    assert.equal(fields.baseUrl.default, "https://api.deepseek.com");

    assert.deepEqual(buildConfig({}), {
        apiKey: "",
        model: "deepseek-chat",
        baseUrl: "https://api.deepseek.com",
        timeoutSec: 120,
        instructions: "",
        substackEmail: "",
        substackPassword: "",
        substackPublication: "newworldvalue",
        xApiKey: "",
        xApiSecret: "",
        xAccessToken: "",
        xAccessTokenSecret: "",
        skillDocs: [],
        skillSecrets: {},
    });
});
