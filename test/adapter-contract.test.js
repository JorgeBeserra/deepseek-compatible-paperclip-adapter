import assert from "node:assert/strict";
import test from "node:test";

import adapterFactory, {
    DASHSCOPE_ADAPTER_METADATA,
    DASHSCOPE_API_ADAPTER_TYPE,
    DEEPSEEK_ADAPTER_METADATA,
    DEEPSEEK_ADAPTER_TYPE,
    LEGACY_OPENAI_COMPATIBLE_ADAPTER_TYPE,
    createServerAdapter,
    getConfigSchema,
    label,
    models,
    type,
} from "../dist/index.js";
import {
    dashscopeServerAdapter,
    deepseekServerAdapter,
} from "../dist/server/index.js";
import { buildConfig } from "../dist/ui/index.js";

test("exports the DeepSeek adapter contract expected by Paperclip", async () => {
    assert.equal(DEEPSEEK_ADAPTER_TYPE, "deepSeek");
    assert.equal(type, DEEPSEEK_ADAPTER_TYPE);
    assert.equal(label, "DeepSeek");
    assert.equal(
        type.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase()),
        "DeepSeek",
    );
    assert.equal(adapterFactory, createServerAdapter);

    const adapter = createServerAdapter();
    assert.equal(adapter, deepseekServerAdapter);
    assert.equal(adapter.type, DEEPSEEK_ADAPTER_TYPE);
    assert.equal(typeof adapter.execute, "function");
    assert.equal(typeof adapter.testEnvironment, "function");
    assert.equal(typeof adapter.getConfigSchema, "function");
    assert.equal(typeof adapter.listModels, "function");
    assert.equal(typeof adapter.refreshModels, "function");
    assert.equal(adapter.models, models);
    assert.deepEqual(await adapter.listModels(), models);
    assert.match(adapter.agentConfigurationDoc, /DeepSeek/);
    assert.equal(typeof adapter.sessionCodec.deserialize, "function");
});

test("keeps legacy named exports as compatibility aliases", () => {
    assert.equal(LEGACY_OPENAI_COMPATIBLE_ADAPTER_TYPE, "openai_compatible_api");
    assert.equal(DASHSCOPE_API_ADAPTER_TYPE, LEGACY_OPENAI_COMPATIBLE_ADAPTER_TYPE);
    assert.equal(DASHSCOPE_ADAPTER_METADATA, DEEPSEEK_ADAPTER_METADATA);
    assert.equal(dashscopeServerAdapter, deepseekServerAdapter);
});

test("uses DeepSeek names and defaults throughout public configuration", () => {
    assert.deepEqual(models, [
        { id: "deepseek-flash", label: "DeepSeek-V4.1-Flash" },
        { id: "deepseek-v4-pro", label: "DeepSeek-V4-Pro" },
    ]);
    assert.equal(DEEPSEEK_ADAPTER_METADATA.label, "DeepSeek");
    assert.match(DEEPSEEK_ADAPTER_METADATA.description, /DeepSeek/);

    const fields = Object.fromEntries(
        getConfigSchema().fields.map((field) => [field.key, field]),
    );
    assert.equal(fields.model.default, "deepseek-flash");
    assert.equal(fields.baseUrl.default, "https://api.deepseek.com");

    assert.deepEqual(buildConfig({}), {
        apiKey: "",
        model: "deepseek-flash",
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

test("refreshes the model catalog from DeepSeek when the server has a global API key", async (t) => {
    const previousApiKey = process.env.DEEPSEEK_API_KEY;
    const previousFetch = globalThis.fetch;
    t.after(() => {
        if (previousApiKey === undefined)
            delete process.env.DEEPSEEK_API_KEY;
        else
            process.env.DEEPSEEK_API_KEY = previousApiKey;
        globalThis.fetch = previousFetch;
    });

    process.env.DEEPSEEK_API_KEY = "test-key";
    globalThis.fetch = async (url, init) => {
        assert.equal(url, "https://api.deepseek.com/models");
        assert.equal(init.headers.Authorization, "Bearer test-key");
        return new Response(JSON.stringify({
            object: "list",
            data: [
                { id: "deepseek-flash", name: "DeepSeek-V4.1-Flash" },
                { id: "deepseek-v4-pro", name: "DeepSeek-V4-Pro" },
            ],
        }));
    };

    assert.deepEqual(await deepseekServerAdapter.refreshModels(), models);
});
