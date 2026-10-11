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
    fetchDeepSeekBalance,
    normalizeTimeoutSec,
    testEnvironment,
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
    assert.equal(adapter.supportsLocalAgentJwt, true);
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
    assert.equal(DEEPSEEK_ADAPTER_METADATA.supportsLocalAgentJwt, true);
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

test("maps DeepSeek balance entries for the adapter environment test", async (t) => {
    const previousFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = previousFetch;
    });
    globalThis.fetch = async (url, init) => {
        assert.equal(url, "https://api.deepseek.com/user/balance");
        assert.equal(init.headers.Authorization, "Bearer balance-test-key");
        return new Response(JSON.stringify({
            is_available: true,
            balance_infos: [
                {
                    currency: "USD",
                    total_balance: "42.50",
                    granted_balance: "2.50",
                    topped_up_balance: "40.00",
                },
                {
                    currency: "CNY",
                    total_balance: "110.00",
                    granted_balance: "10.00",
                    topped_up_balance: "100.00",
                },
            ],
        }));
    };

    const result = await fetchDeepSeekBalance({ apiKey: "balance-test-key" });
    assert.equal(result.provider, "deepseek");
    assert.equal(result.ok, true);
    assert.deepEqual(result.windows, [
        {
            label: "DeepSeek balance (USD)",
            usedPercent: null,
            resetsAt: null,
            valueLabel: "USD 42.50 remaining",
            detail: "Granted: USD 2.50 · Topped up: USD 40.00 · API calls: available",
        },
        {
            label: "DeepSeek balance (CNY)",
            usedPercent: null,
            resetsAt: null,
            valueLabel: "CNY 110.00 remaining",
            detail: "Granted: CNY 10.00 · Topped up: CNY 100.00 · API calls: available",
        },
    ]);
});

test("reports a rejected DeepSeek balance key without throwing", async (t) => {
    const previousFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = previousFetch;
    });
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });

    const result = await fetchDeepSeekBalance({ apiKey: "invalid-key" });
    assert.equal(result.ok, false);
    assert.deepEqual(result.windows, []);
    assert.match(result.error, /rejected.*HTTP 401/i);
});

test("does not report success when DeepSeek returns no valid balance entries", async (t) => {
    const previousFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = previousFetch;
    });
    globalThis.fetch = async () => new Response(JSON.stringify({
        is_available: true,
        balance_infos: [null],
    }));

    const result = await fetchDeepSeekBalance({ apiKey: "balance-test-key" });
    assert.equal(result.ok, false);
    assert.deepEqual(result.windows, []);
    assert.match(result.error, /no balance entries/i);
});

test("fails the environment test without an API key and does not call DeepSeek", async (t) => {
    const previousFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = previousFetch;
    });
    globalThis.fetch = async () => {
        throw new Error("fetch must not be called without an API key");
    };

    const result = await testEnvironment({
        companyId: "company-1",
        adapterType: DEEPSEEK_ADAPTER_TYPE,
        config: {
            apiKey: "",
            model: "deepseek-flash",
            baseUrl: "https://api.deepseek.com",
        },
    });

    assert.equal(result.status, "fail");
    assert.equal(result.checks[0].code, "deepseek_api_key_missing");
});

test("tests the API key and configured model against DeepSeek", async (t) => {
    const previousFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = previousFetch;
    });
    globalThis.fetch = async (url, init) => {
        assert.equal(init.headers.Authorization, "Bearer valid-test-key");
        if (url === "https://api.deepseek.com/user/balance") {
            return new Response(JSON.stringify({
                is_available: true,
                balance_infos: [{
                    currency: "USD",
                    total_balance: "42.50",
                    granted_balance: "2.50",
                    topped_up_balance: "40.00",
                }],
            }));
        }
        assert.equal(url, "https://api.deepseek.com/models");
        return new Response(JSON.stringify({
            object: "list",
            data: [
                { id: "deepseek-flash", name: "DeepSeek-V4.1-Flash" },
                { id: "deepseek-v4-pro", name: "DeepSeek-V4-Pro" },
            ],
        }));
    };

    const result = await testEnvironment({
        companyId: "company-1",
        adapterType: DEEPSEEK_ADAPTER_TYPE,
        config: {
            apiKey: "valid-test-key",
            model: "deepseek-v4-pro",
            baseUrl: "https://api.deepseek.com",
        },
    });

    assert.equal(result.status, "pass");
    assert.deepEqual(result.checks.map((check) => check.code), [
        "deepseek_auth_valid",
        "deepseek_model_available",
        "deepseek_balance_usd",
    ]);
    assert.equal(result.checks[2].message, "Balance: USD 42.50 remaining");
    assert.match(result.checks[2].detail, /Granted: USD 2\.50/);
});

test("fails the environment test when DeepSeek rejects the API key", async (t) => {
    const previousFetch = globalThis.fetch;
    t.after(() => {
        globalThis.fetch = previousFetch;
    });
    globalThis.fetch = async () => new Response("Unauthorized", { status: 401 });

    const result = await testEnvironment({
        companyId: "company-1",
        adapterType: DEEPSEEK_ADAPTER_TYPE,
        config: {
            apiKey: "invalid-test-key",
            model: "deepseek-flash",
            baseUrl: "https://api.deepseek.com",
        },
    });

    assert.equal(result.status, "fail");
    assert.equal(result.checks[0].code, "deepseek_auth_failed");
});

test("never converts an empty or non-positive timeout into an instant timeout", () => {
    assert.equal(normalizeTimeoutSec(undefined), 120);
    assert.equal(normalizeTimeoutSec(""), 120);
    assert.equal(normalizeTimeoutSec(0), 120);
    assert.equal(normalizeTimeoutSec("0"), 120);
    assert.equal(normalizeTimeoutSec(-5), 120);
    assert.equal(normalizeTimeoutSec("invalid"), 120);
    assert.equal(normalizeTimeoutSec(45), 45);

    assert.equal(buildConfig({ timeoutSec: "0" }).timeoutSec, 120);
    assert.equal(buildConfig({ timeoutSec: "-1" }).timeoutSec, 120);
    assert.equal(buildConfig({ timeoutSec: "45" }).timeoutSec, 45);
});

test("fails before provider dispatch when Paperclip does not inject an agent token", async () => {
    let providerCalled = false;
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => {
        providerCalled = true;
        throw new Error("provider must not be called without Paperclip authentication");
    };

    try {
        const result = await deepseekServerAdapter.execute({
            runId: "run-1",
            agent: {
                id: "agent-1",
                companyId: "company-1",
                name: "CEO",
                adapterType: DEEPSEEK_ADAPTER_TYPE,
                adapterConfig: {},
            },
            runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
            config: { apiKey: "deepseek-test-key", model: "deepseek-flash" },
            context: {},
            onLog: async () => {},
        });

        assert.equal(result.exitCode, 1);
        assert.equal(result.errorCode, "paperclip_auth_token_missing");
        assert.equal(providerCalled, false);
    }
    finally {
        globalThis.fetch = previousFetch;
    }
});

test("stops the agent loop on the first Paperclip authentication rejection", async () => {
    const previousFetch = globalThis.fetch;
    const requestedUrls = [];
    globalThis.fetch = async (url, init) => {
        requestedUrls.push(String(url));
        if (String(url) === "https://api.deepseek.com/chat/completions") {
            return new Response(JSON.stringify({
                choices: [{
                    finish_reason: "tool_calls",
                    message: {
                        role: "assistant",
                        content: null,
                        tool_calls: [
                            {
                                id: "call-1",
                                type: "function",
                                function: { name: "paperclip_list_agents", arguments: "{}" },
                            },
                            {
                                id: "call-2",
                                type: "function",
                                function: { name: "paperclip_list_projects", arguments: "{}" },
                            },
                        ],
                    },
                }],
                usage: { prompt_tokens: 10, completion_tokens: 5 },
            }));
        }

        assert.equal(init.headers.Authorization, "Bearer run-token");
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    };

    try {
        const result = await deepseekServerAdapter.execute({
            runId: "run-1",
            authToken: "run-token",
            agent: {
                id: "agent-1",
                companyId: "company-1",
                name: "CEO",
                adapterType: DEEPSEEK_ADAPTER_TYPE,
                adapterConfig: {},
            },
            runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
            config: { apiKey: "deepseek-test-key", model: "deepseek-flash" },
            context: {},
            onLog: async () => {},
        });

        assert.equal(result.exitCode, 1);
        assert.equal(result.errorCode, "paperclip_auth_rejected");
        assert.equal(requestedUrls.length, 2);
    }
    finally {
        globalThis.fetch = previousFetch;
    }
});

test("does not instruct agents to perform unsolicited adapter migrations", async () => {
    const previousFetch = globalThis.fetch;
    let providerRequest;
    globalThis.fetch = async (url, init) => {
        assert.equal(String(url), "https://api.deepseek.com/chat/completions");
        providerRequest = JSON.parse(init.body);
        return new Response(JSON.stringify({
            choices: [{
                finish_reason: "stop",
                message: { role: "assistant", content: "Ready." },
            }],
            usage: { prompt_tokens: 10, completion_tokens: 2 },
        }));
    };

    try {
        const result = await deepseekServerAdapter.execute({
            runId: "run-1",
            authToken: "run-token",
            agent: {
                id: "agent-1",
                companyId: "company-1",
                name: "CEO",
                adapterType: DEEPSEEK_ADAPTER_TYPE,
                adapterConfig: {},
            },
            runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
            config: { apiKey: "deepseek-test-key", model: "deepseek-flash" },
            context: {},
            onLog: async () => {},
        });

        assert.equal(result.exitCode, 0);
        const prompt = JSON.stringify(providerRequest.messages);
        assert.match(prompt, /Different adapter types are valid/);
        assert.doesNotMatch(prompt, /Any agent NOT using adapterType/);
        assert.doesNotMatch(prompt, /Always set adapterType.*deepSeek/i);
    }
    finally {
        globalThis.fetch = previousFetch;
    }
});

test("preserves an explicitly requested non-DeepSeek adapter when creating an agent", async () => {
    const previousFetch = globalThis.fetch;
    let providerCalls = 0;
    let createdAgentBody;
    globalThis.fetch = async (url, init) => {
        if (String(url) === "https://api.deepseek.com/chat/completions") {
            providerCalls++;
            if (providerCalls === 1) {
                return new Response(JSON.stringify({
                    choices: [{
                        finish_reason: "tool_calls",
                        message: {
                            role: "assistant",
                            content: null,
                            tool_calls: [{
                                id: "call-create-agent",
                                type: "function",
                                function: {
                                    name: "paperclip_create_agent",
                                    arguments: JSON.stringify({
                                        name: "Developer",
                                        adapterType: "codex_local",
                                        adapterConfig: { command: "codex" },
                                    }),
                                },
                            }],
                        },
                    }],
                    usage: { prompt_tokens: 10, completion_tokens: 5 },
                }));
            }
            return new Response(JSON.stringify({
                choices: [{
                    finish_reason: "stop",
                    message: { role: "assistant", content: "Created." },
                }],
                usage: { prompt_tokens: 5, completion_tokens: 2 },
            }));
        }

        createdAgentBody = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: "new-agent" }));
    };

    try {
        const result = await deepseekServerAdapter.execute({
            runId: "run-1",
            authToken: "run-token",
            agent: {
                id: "agent-1",
                companyId: "company-1",
                name: "CEO",
                adapterType: DEEPSEEK_ADAPTER_TYPE,
                adapterConfig: {
                    apiKey: "private-deepseek-key",
                    model: "deepseek-v4-pro",
                    baseUrl: "https://api.deepseek.com",
                },
            },
            runtime: { sessionId: null, sessionParams: null, sessionDisplayId: null, taskKey: null },
            config: { apiKey: "deepseek-test-key", model: "deepseek-flash" },
            context: {},
            onLog: async () => {},
        });

        assert.equal(result.exitCode, 0);
        assert.equal(createdAgentBody.adapterType, "codex_local");
        assert.deepEqual(createdAgentBody.adapterConfig, { command: "codex" });
        assert.equal(providerCalls, 2);
    }
    finally {
        globalThis.fetch = previousFetch;
    }
});
