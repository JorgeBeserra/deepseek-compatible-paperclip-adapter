import { asString, asNumber, buildPaperclipEnv, renderPaperclipWakePrompt, stringifyPaperclipWakePayload } from "@paperclipai/adapter-utils/server-utils";
import { createHmac, randomBytes } from "crypto";
// ---------------------------------------------------------------------------
// OAuth 1.0a signing (for X API v2) — no external dependency
// ---------------------------------------------------------------------------
function signOAuth1(method, url, params, consumerKey, consumerSecret, accessToken, accessTokenSecret) {
    const oauthParams = {
        oauth_consumer_key: consumerKey,
        oauth_nonce: randomBytes(16).toString("hex"),
        oauth_signature_method: "HMAC-SHA1",
        oauth_timestamp: String(Math.floor(Date.now() / 1000)),
        oauth_token: accessToken,
        oauth_version: "1.0",
        ...params,
    };
    const enc = (s) => encodeURIComponent(s);
    const sortedEntries = Object.entries(oauthParams).sort(([a], [b]) => a < b ? -1 : 1);
    const paramString = sortedEntries.map(([k, v]) => `${enc(k)}=${enc(v)}`).join("&");
    const baseString = `${method.toUpperCase()}&${enc(url)}&${enc(paramString)}`;
    const signingKey = `${enc(consumerSecret)}&${enc(accessTokenSecret)}`;
    const signature = createHmac("sha1", signingKey).update(baseString).digest("base64");
    oauthParams["oauth_signature"] = signature;
    return "OAuth " + Object.entries(oauthParams)
        .filter(([k]) => k.startsWith("oauth_"))
        .sort(([a], [b]) => a < b ? -1 : 1)
        .map(([k, v]) => `${enc(k)}="${enc(v)}"`)
        .join(", ");
}
// ---------------------------------------------------------------------------
// Paperclip tool definitions (OpenAI function calling format)
// ---------------------------------------------------------------------------
const PAPERCLIP_TOOLS = [
    {
        type: "function",
        function: {
            name: "paperclip_me",
            description: "Get the current authenticated agent's details (id, name, companyId, role)",
            parameters: { type: "object", properties: {} },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_list_agents",
            description: "List all agents in the company",
            parameters: {
                type: "object",
                properties: {
                    companyId: { type: "string", description: "Company UUID (optional, uses current company if omitted)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_list_issues",
            description: "List issues in the company with optional filters. Use status='todo' to find work ready to assign.",
            parameters: {
                type: "object",
                properties: {
                    companyId: { type: "string", description: "Company UUID (optional)" },
                    status: { type: "string", description: "Filter by status: todo, in_progress, done, backlog, blocked, cancelled" },
                    projectId: { type: "string", description: "Filter by project UUID" },
                    assigneeAgentId: { type: "string", description: "Filter by assigned agent UUID" },
                    q: { type: "string", description: "Search query" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_get_issue",
            description: "Get full details of a single issue by UUID or identifier (e.g. NWV-1)",
            parameters: {
                type: "object",
                required: ["issueId"],
                properties: {
                    issueId: { type: "string", description: "Issue UUID or short identifier" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_create_issue",
            description: "Create a new issue (task) in the company. ALWAYS include projectId — call paperclip_list_projects first if you don't have it.",
            parameters: {
                type: "object",
                required: ["title", "projectId"],
                properties: {
                    companyId: { type: "string", description: "Company UUID (optional)" },
                    title: { type: "string", description: "Issue title" },
                    description: { type: "string", description: "Issue description in markdown" },
                    status: { type: "string", description: "Initial status: backlog (default), todo, in_progress, in_review, done, blocked, cancelled" },
                    priority: { type: "string", description: "Priority: critical, high, medium, low" },
                    assigneeAgentId: { type: "string", description: "UUID of agent to assign to" },
                    projectId: { type: "string", description: "REQUIRED: Project UUID to file under. Always provide this." },
                    labelIds: { type: "array", items: { type: "string" }, description: "Label UUIDs" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_update_issue",
            description: "Update an issue — change status, assignee, priority, title, or description",
            parameters: {
                type: "object",
                required: ["issueId"],
                properties: {
                    issueId: { type: "string", description: "Issue UUID or identifier" },
                    title: { type: "string" },
                    description: { type: "string" },
                    status: { type: "string", description: "New status: backlog, todo, in_progress, in_review, done, blocked, cancelled" },
                    priority: { type: "string", description: "New priority: critical, high, medium, low" },
                    assigneeAgentId: { type: "string", description: "UUID of new assignee agent" },
                    comment: { type: "string", description: "Optional comment to post alongside the update" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_checkout_issue",
            description: "Check out an issue for an agent to begin working on it (sets status to in_progress)",
            parameters: {
                type: "object",
                required: ["issueId"],
                properties: {
                    issueId: { type: "string", description: "Issue UUID or identifier" },
                    agentId: { type: "string", description: "Agent UUID to check out for (optional, defaults to self)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_add_comment",
            description: "Add a comment to an issue — for status updates, decisions, or communication between agents",
            parameters: {
                type: "object",
                required: ["issueId", "body"],
                properties: {
                    issueId: { type: "string", description: "Issue UUID or identifier" },
                    body: { type: "string", description: "Comment body in markdown" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_list_comments",
            description: "List comments on an issue",
            parameters: {
                type: "object",
                required: ["issueId"],
                properties: {
                    issueId: { type: "string", description: "Issue UUID or identifier" },
                    limit: { type: "number", description: "Max comments to return (default 50)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_upsert_document",
            description: "Create or update a document attached to an issue (for article drafts, research, deliverables)",
            parameters: {
                type: "object",
                required: ["issueId", "key", "body"],
                properties: {
                    issueId: { type: "string", description: "Issue UUID or identifier" },
                    key: { type: "string", description: "Document key (slug, e.g. 'draft', 'research', 'brief')" },
                    title: { type: "string", description: "Document title" },
                    body: { type: "string", description: "Document body in markdown" },
                    changeSummary: { type: "string", description: "Summary of changes for this revision" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_list_projects",
            description: "List projects in the company",
            parameters: {
                type: "object",
                properties: {
                    companyId: { type: "string", description: "Company UUID (optional)" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_create_agent",
            description: "Create (hire) a new agent in the company. Always set adapterType to deepSeek and include a system prompt in adapterConfig.instructions describing the agent's role.",
            parameters: {
                type: "object",
                required: ["name", "adapterType"],
                properties: {
                    companyId: { type: "string", description: "Company UUID (optional)" },
                    name: { type: "string", description: "Agent name (e.g. 'Research Director')" },
                    title: { type: "string", description: "Agent title/position (e.g. 'Research Director')" },
                    role: { type: "string", description: "Agent role: general (default), engineer, researcher, writer, reviewer, manager" },
                    capabilities: { type: "string", description: "Short description of what this agent can do" },
                    reportsTo: { type: "string", description: "UUID of the manager agent this agent reports to" },
                    adapterType: { type: "string", description: "Always use deepSeek" },
                    adapterConfig: {
                        type: "object",
                        description: "Adapter configuration. Must include: apiKey, model, baseUrl, instructions (system prompt / AGENTS.md for this agent)",
                        properties: {
                            apiKey: { type: "string" },
                            model: { type: "string" },
                            baseUrl: { type: "string" },
                            timeoutSec: { type: "number" },
                            instructions: { type: "string", description: "Full system prompt / role definition for this agent" },
                        },
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_update_agent",
            description: "Update an existing agent's configuration, adapter type, title, capabilities, or system prompt. Use replaceAdapterConfig=true when switching an agent's adapter type or fully replacing its config.",
            parameters: {
                type: "object",
                required: ["agentId"],
                properties: {
                    agentId: { type: "string", description: "Agent UUID (also accepted as 'id')" },
                    id: { type: "string", description: "Agent UUID — alternative to agentId" },
                    name: { type: "string" },
                    title: { type: "string" },
                    capabilities: { type: "string" },
                    reportsTo: { type: "string", description: "UUID of manager agent" },
                    adapterType: { type: "string", description: "New adapter type, e.g. deepSeek" },
                    adapterConfig: {
                        type: "object",
                        description: "Adapter config to apply. Set replaceAdapterConfig=true to fully replace rather than merge.",
                        properties: {
                            apiKey: { type: "string" },
                            model: { type: "string" },
                            baseUrl: { type: "string" },
                            instructions: { type: "string", description: "System prompt / role definition" },
                        },
                    },
                    replaceAdapterConfig: { type: "boolean", description: "If true, replaces the entire adapterConfig instead of merging. Use when switching adapter type." },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "paperclip_create_approval",
            description: "Create a board approval gate — use for Gate 1, Gate 2, Gate 3 checkpoints requiring human sign-off",
            parameters: {
                type: "object",
                required: ["title"],
                properties: {
                    companyId: { type: "string", description: "Company UUID (optional)" },
                    title: { type: "string", description: "Approval title" },
                    description: { type: "string", description: "What is being submitted for approval" },
                    type: { type: "string", description: "Approval type: request_board_approval (default), hire_agent, approve_ceo_strategy, budget_override_required" },
                    issueIds: { type: "array", items: { type: "string" }, description: "Issue UUIDs to link to this approval" },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "create_substack_draft",
            description: "Create a draft post on Substack. The draft is NOT published automatically — a human reviews and clicks Publish. Returns the draft URL.",
            parameters: {
                type: "object",
                required: ["title", "body"],
                properties: {
                    title: { type: "string", description: "Post title" },
                    subtitle: { type: "string", description: "Post subtitle / preview text (80-120 chars recommended)" },
                    body: { type: "string", description: "Post body in markdown. Will be converted to HTML for Substack." },
                    audience: {
                        type: "string",
                        description: "Who can see the post: \"everyone\" (default, free) or \"paid\" (subscribers only)",
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "follow_on_x",
            description: "Follow a user on X.com (Twitter) by their username (handle without @). Uses the authenticated account's credentials.",
            parameters: {
                type: "object",
                required: ["username"],
                properties: {
                    username: {
                        type: "string",
                        description: "X.com username to follow, without the @ symbol. e.g. \"HKMA_Official\"",
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "post_to_x",
            description: "Post a tweet or thread to X.com (Twitter). For a single tweet pass one string in posts[]. For a thread pass multiple strings — each becomes a reply to the previous.",
            parameters: {
                type: "object",
                required: ["posts"],
                properties: {
                    posts: {
                        type: "array",
                        items: { type: "string" },
                        description: "Array of post texts. Single item = single tweet. Multiple items = thread. Each post must be ≤280 characters.",
                    },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "reply_to_x",
            description: "Reply to a specific tweet on X.com by tweet ID.",
            parameters: {
                type: "object",
                required: ["tweetId", "text"],
                properties: {
                    tweetId: { type: "string", description: "The tweet ID to reply to." },
                    text: { type: "string", description: "Reply text, ≤280 characters." },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "like_tweet",
            description: "Like a tweet on X.com by tweet ID.",
            parameters: {
                type: "object",
                required: ["tweetId"],
                properties: {
                    tweetId: { type: "string", description: "The tweet ID to like." },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "retweet",
            description: "Retweet a tweet on X.com by tweet ID.",
            parameters: {
                type: "object",
                required: ["tweetId"],
                properties: {
                    tweetId: { type: "string", description: "The tweet ID to retweet." },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "search_x",
            description: "Search recent tweets (last 7 days) on X.com by keyword or query. Returns tweet IDs, text, author, and engagement metrics. Use to find relevant conversations to engage with.",
            parameters: {
                type: "object",
                required: ["query"],
                properties: {
                    query: { type: "string", description: "Search query. Supports X search operators e.g. \"petrodollar lang:en -is:retweet\"." },
                    maxResults: { type: "number", description: "Number of results to return (10–100, default 20)." },
                },
            },
        },
    },
    {
        type: "function",
        function: {
            name: "get_tweet_metrics",
            description: "Get public engagement metrics (likes, retweets, replies, impressions) for a tweet by ID. Use to check performance of posts.",
            parameters: {
                type: "object",
                required: ["tweetId"],
                properties: {
                    tweetId: { type: "string", description: "The tweet ID to fetch metrics for." },
                },
            },
        },
    },
];
// ---------------------------------------------------------------------------
// Paperclip API helper
// ---------------------------------------------------------------------------
async function callPaperclipApi(method, path, authToken, runId, body) {
    const runtimeHost = process.env.PAPERCLIP_LISTEN_HOST ?? process.env.HOST ?? "localhost";
    const runtimePort = process.env.PAPERCLIP_LISTEN_PORT ?? process.env.PORT ?? "3100";
    const apiUrl = process.env.PAPERCLIP_API_URL ?? `http://${runtimeHost}:${runtimePort}`;
    const url = `${apiUrl.replace(/\/$/, "")}/api${path}`;
    const isWrite = !["GET", "HEAD"].includes(method.toUpperCase());
    const headers = {
        Authorization: `Bearer ${authToken}`,
        Accept: "application/json",
    };
    if (body !== undefined)
        headers["Content-Type"] = "application/json";
    if (isWrite && runId)
        headers["X-Paperclip-Run-Id"] = runId;
    const res = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch {
        parsed = text;
    }
    if (!res.ok) {
        const errMsg = parsed && typeof parsed === "object" && "error" in parsed
            ? parsed.error
            : text;
        throw new Error(`${method} ${path} failed with ${res.status}: ${errMsg}`);
    }
    return parsed;
}
// ---------------------------------------------------------------------------
// Tool executor — maps LLM tool calls to Paperclip API calls
// ---------------------------------------------------------------------------
async function executeTool(name, args, ctx, companyId) {
    const authToken = ctx.authToken ?? "";
    const runId = ctx.runId;
    const agentId = ctx.agent.id;
    const encId = (id) => encodeURIComponent(id);
    switch (name) {
        case "paperclip_me":
            // Return agent info from execution context directly — avoids agent-key-only auth requirement
            return {
                id: ctx.agent.id,
                companyId: ctx.agent.companyId,
                name: ctx.agent.name,
                adapterType: ctx.agent.adapterType,
            };
        case "paperclip_list_agents": {
            const cid = asString(args.companyId, companyId);
            const agentList = await callPaperclipApi("GET", `/companies/${encId(cid)}/agents`, authToken, runId);
            // Strip adapterConfig.instructions to keep responses small (can be ~10k tokens)
            if (Array.isArray(agentList)) {
                return agentList.map((a) => {
                    if (a?.adapterConfig && typeof a.adapterConfig === "object") {
                        const { instructions: _i, ...cfgRest } = a.adapterConfig;
                        return { ...a, adapterConfig: cfgRest };
                    }
                    return a;
                });
            }
            return agentList;
        }
        case "paperclip_list_issues": {
            const cid = asString(args.companyId, companyId);
            const params = new URLSearchParams();
            for (const [k, v] of Object.entries(args)) {
                if (k === "companyId" || v === undefined || v === null)
                    continue;
                params.set(k, String(v));
            }
            const qs = params.toString();
            return callPaperclipApi("GET", `/companies/${encId(cid)}/issues${qs ? `?${qs}` : ""}`, authToken, runId);
        }
        case "paperclip_get_issue":
            return callPaperclipApi("GET", `/issues/${encId(asString(args.issueId, ""))}`, authToken, runId);
        case "paperclip_create_issue": {
            const cid = asString(args.companyId, companyId);
            const { companyId: _cid, ...body } = args;
            return callPaperclipApi("POST", `/companies/${encId(cid)}/issues`, authToken, runId, body);
        }
        case "paperclip_update_issue": {
            const issueId = asString(args.issueId, "");
            const { issueId: _id, ...body } = args;
            return callPaperclipApi("PATCH", `/issues/${encId(issueId)}`, authToken, runId, body);
        }
        case "paperclip_checkout_issue":
            return callPaperclipApi("POST", `/issues/${encId(asString(args.issueId, ""))}/checkout`, authToken, runId, {
                agentId: asString(args.agentId, agentId),
                expectedStatuses: ["todo", "backlog", "blocked"],
            });
        case "paperclip_add_comment": {
            const issueId = asString(args.issueId, "");
            return callPaperclipApi("POST", `/issues/${encId(issueId)}/comments`, authToken, runId, { body: asString(args.body, "") });
        }
        case "paperclip_list_comments": {
            const issueId = asString(args.issueId, "");
            const params = new URLSearchParams();
            if (args.limit)
                params.set("limit", String(args.limit));
            const qs = params.toString();
            return callPaperclipApi("GET", `/issues/${encId(issueId)}/comments${qs ? `?${qs}` : ""}`, authToken, runId);
        }
        case "paperclip_upsert_document": {
            const issueId = asString(args.issueId, "");
            const key = asString(args.key, "");
            if (!issueId)
                throw new Error("paperclip_upsert_document requires issueId");
            if (!key)
                throw new Error("paperclip_upsert_document requires key");
            const { issueId: _id, key: _key, baseRevisionId: _brid, ...body } = args;
            // If no baseRevisionId provided, fetch the current document to get it
            let baseRevisionId = asString(args.baseRevisionId, "");
            if (!baseRevisionId) {
                try {
                    const existing = await callPaperclipApi("GET", `/issues/${encId(issueId)}/documents/${encId(key)}`, authToken, runId);
                    baseRevisionId = existing?.currentRevisionId ?? existing?.latestRevisionId ?? "";
                }
                catch {
                    // Document doesn't exist yet — first create, no baseRevisionId needed
                }
            }
            return callPaperclipApi("PUT", `/issues/${encId(issueId)}/documents/${encId(key)}`, authToken, runId, { format: "markdown", ...body, ...(baseRevisionId ? { baseRevisionId } : {}) });
        }
        case "paperclip_list_projects": {
            const cid = asString(args.companyId, companyId);
            return callPaperclipApi("GET", `/companies/${encId(cid)}/projects`, authToken, runId);
        }
        case "paperclip_create_approval": {
            const cid = asString(args.companyId, companyId);
            const { companyId: _cid, title, description, issueIds, type, payload, ...rest } = args;
            // type must be one of: hire_agent, approve_ceo_strategy, budget_override_required, request_board_approval
            const approvalType = asString(type, "request_board_approval");
            const approvalPayload = (payload && typeof payload === "object") ? payload : { title: asString(title, ""), description: asString(description, "") };
            return callPaperclipApi("POST", `/companies/${encId(cid)}/approvals`, authToken, runId, {
                type: approvalType,
                payload: approvalPayload,
                issueIds: Array.isArray(issueIds) ? issueIds : [],
                requestedByAgentId: agentId,
            });
        }
        case "paperclip_create_agent": {
            const cid = asString(args.companyId, companyId);
            const { companyId: _cid, adapterConfig: rawAdapterConfig, adapterType, ...agentBodyRest } = args;
            // Build adapterConfig — auto-propagate CEO's apiKey, baseUrl, and model as defaults
            const suppliedConfig = (rawAdapterConfig && typeof rawAdapterConfig === "object") ? rawAdapterConfig : {};
            const creatorCfg = (ctx.agent.adapterConfig && typeof ctx.agent.adapterConfig === "object") ? ctx.agent.adapterConfig : {};
            const inheritedApiKey = asString(creatorCfg["apiKey"], "");
            const inheritedBaseUrl = asString(creatorCfg["baseUrl"], "https://api.deepseek.com");
            const inheritedModel = asString(creatorCfg["model"], "deepseek-flash");
            const mergedAdapterConfig = {
                apiKey: suppliedConfig["apiKey"] ?? inheritedApiKey,
                model: suppliedConfig["model"] ?? inheritedModel,
                baseUrl: suppliedConfig["baseUrl"] ?? inheritedBaseUrl,
                instructions: asString(suppliedConfig["instructions"], ""),
                ...(suppliedConfig["timeoutSec"] !== undefined ? { timeoutSec: suppliedConfig["timeoutSec"] } : {}),
            };
            return callPaperclipApi("POST", `/companies/${encId(cid)}/agents`, authToken, runId, {
                ...agentBodyRest,
                adapterType: "deepSeek",
                adapterConfig: mergedAdapterConfig,
            });
        }
        case "paperclip_update_agent": {
            const { agentId: targetAgentId, id: targetId, adapterConfig: patchConfig, replaceAdapterConfig, ...rest } = args;
            // Accept agentId or id (LLM may use either based on list_agents response shape)
            const tid = asString(targetAgentId, "") || asString(targetId, "");
            if (!tid)
                throw new Error("agentId (or id) is required for paperclip_update_agent");
            const patchBody = { ...rest };
            if (patchConfig && typeof patchConfig === "object") {
                patchBody["adapterConfig"] = patchConfig;
            }
            if (replaceAdapterConfig === true) {
                patchBody["replaceAdapterConfig"] = true;
            }
            return callPaperclipApi("PATCH", `/agents/${encId(tid)}`, authToken, runId, patchBody);
        }
        case "post_to_x": {
            const xApiKey = asString(ctx.config.xApiKey, "");
            const xApiSecret = asString(ctx.config.xApiSecret, "");
            const xAccessToken = asString(ctx.config.xAccessToken, "");
            const xAccessTokenSecret = asString(ctx.config.xAccessTokenSecret, "");
            if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
                throw new Error("X.com credentials not configured. Set xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret in adapterConfig.");
            }
            const rawPosts = args.posts;
            const posts = Array.isArray(rawPosts)
                ? rawPosts.map((p) => String(p)).filter(Boolean)
                : [];
            if (posts.length === 0)
                throw new Error("post_to_x: posts array is empty");
            const tweetUrl = "https://api.twitter.com/2/tweets";
            const postedIds = [];
            for (const text of posts) {
                const body = { text };
                if (postedIds.length > 0) {
                    body["reply"] = { in_reply_to_tweet_id: postedIds[postedIds.length - 1] };
                }
                const authHeader = signOAuth1("POST", tweetUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
                const res = await fetch(tweetUrl, {
                    method: "POST",
                    headers: {
                        Authorization: authHeader,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(body),
                });
                const json = await res.json();
                if (!res.ok) {
                    throw new Error(`X API error ${res.status}: ${JSON.stringify(json)}`);
                }
                postedIds.push(json.data?.id ?? "");
            }
            return { posted: postedIds.length, ids: postedIds };
        }
        case "reply_to_x": {
            const xApiKey = asString(ctx.config.xApiKey, "");
            const xApiSecret = asString(ctx.config.xApiSecret, "");
            const xAccessToken = asString(ctx.config.xAccessToken, "");
            const xAccessTokenSecret = asString(ctx.config.xAccessTokenSecret, "");
            if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
                throw new Error("X.com credentials not configured.");
            }
            const tweetId = asString(args.tweetId, "");
            const text = asString(args.text, "");
            if (!tweetId)
                throw new Error("reply_to_x: tweetId is required");
            if (!text)
                throw new Error("reply_to_x: text is required");
            const url = "https://api.twitter.com/2/tweets";
            const auth = signOAuth1("POST", url, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const res = await fetch(url, {
                method: "POST",
                headers: { Authorization: auth, "Content-Type": "application/json" },
                body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: tweetId } }),
            });
            const json = await res.json();
            if (!res.ok)
                throw new Error(`X API error ${res.status}: ${JSON.stringify(json)}`);
            return { replied: true, tweetId, replyId: json.data?.id };
        }
        case "like_tweet": {
            const xApiKey = asString(ctx.config.xApiKey, "");
            const xApiSecret = asString(ctx.config.xApiSecret, "");
            const xAccessToken = asString(ctx.config.xAccessToken, "");
            const xAccessTokenSecret = asString(ctx.config.xAccessTokenSecret, "");
            if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
                throw new Error("X.com credentials not configured.");
            }
            const tweetId = asString(args.tweetId, "");
            if (!tweetId)
                throw new Error("like_tweet: tweetId is required");
            // Get own user ID first
            const meUrl = "https://api.twitter.com/2/users/me";
            const meAuth = signOAuth1("GET", meUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const meRes = await fetch(meUrl, { headers: { Authorization: meAuth, Accept: "application/json" } });
            const meJson = await meRes.json();
            if (!meRes.ok)
                throw new Error(`X API error ${meRes.status}: ${JSON.stringify(meJson)}`);
            const myId = meJson.data?.id;
            const likeUrl = `https://api.twitter.com/2/users/${myId}/likes`;
            const likeAuth = signOAuth1("POST", likeUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const likeRes = await fetch(likeUrl, {
                method: "POST",
                headers: { Authorization: likeAuth, "Content-Type": "application/json" },
                body: JSON.stringify({ tweet_id: tweetId }),
            });
            const likeJson = await likeRes.json();
            if (!likeRes.ok)
                throw new Error(`X API error ${likeRes.status}: ${JSON.stringify(likeJson)}`);
            return { liked: likeJson.data?.liked ?? true, tweetId };
        }
        case "retweet": {
            const xApiKey = asString(ctx.config.xApiKey, "");
            const xApiSecret = asString(ctx.config.xApiSecret, "");
            const xAccessToken = asString(ctx.config.xAccessToken, "");
            const xAccessTokenSecret = asString(ctx.config.xAccessTokenSecret, "");
            if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
                throw new Error("X.com credentials not configured.");
            }
            const tweetId = asString(args.tweetId, "");
            if (!tweetId)
                throw new Error("retweet: tweetId is required");
            const meUrl = "https://api.twitter.com/2/users/me";
            const meAuth = signOAuth1("GET", meUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const meRes = await fetch(meUrl, { headers: { Authorization: meAuth, Accept: "application/json" } });
            const meJson = await meRes.json();
            if (!meRes.ok)
                throw new Error(`X API error ${meRes.status}: ${JSON.stringify(meJson)}`);
            const myId = meJson.data?.id;
            const rtUrl = `https://api.twitter.com/2/users/${myId}/retweets`;
            const rtAuth = signOAuth1("POST", rtUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const rtRes = await fetch(rtUrl, {
                method: "POST",
                headers: { Authorization: rtAuth, "Content-Type": "application/json" },
                body: JSON.stringify({ tweet_id: tweetId }),
            });
            const rtJson = await rtRes.json();
            if (!rtRes.ok)
                throw new Error(`X API error ${rtRes.status}: ${JSON.stringify(rtJson)}`);
            return { retweeted: rtJson.data?.retweeted ?? true, tweetId };
        }
        case "search_x": {
            const xApiKey = asString(ctx.config.xApiKey, "");
            const xApiSecret = asString(ctx.config.xApiSecret, "");
            const xAccessToken = asString(ctx.config.xAccessToken, "");
            const xAccessTokenSecret = asString(ctx.config.xAccessTokenSecret, "");
            if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
                throw new Error("X.com credentials not configured.");
            }
            const query = asString(args.query, "");
            if (!query)
                throw new Error("search_x: query is required");
            const maxResults = Math.min(100, Math.max(10, asNumber(args.maxResults, 20)));
            const searchQp = {
                query,
                max_results: String(maxResults),
                "tweet.fields": "public_metrics,author_id,created_at",
                expansions: "author_id",
                "user.fields": "name,username",
            };
            const searchUrl = `https://api.twitter.com/2/tweets/search/recent?${new URLSearchParams(searchQp)}`;
            // OAuth 1.0a: query params must be included in the signature base string
            const searchAuth = signOAuth1("GET", "https://api.twitter.com/2/tweets/search/recent", searchQp, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const searchRes = await fetch(searchUrl, { headers: { Authorization: searchAuth, Accept: "application/json" } });
            const searchJson = await searchRes.json();
            if (!searchRes.ok)
                throw new Error(`X API error ${searchRes.status}: ${JSON.stringify(searchJson)}`);
            // Map user lookup for convenience
            const usersById = {};
            for (const u of (searchJson.includes?.users ?? [])) {
                usersById[u.id] = { name: u.name, username: u.username };
            }
            const tweets = (searchJson.data ?? []).map((t) => ({
                id: t.id,
                text: t.text,
                author: usersById[t.author_id] ?? { username: t.author_id },
                created_at: t.created_at,
                metrics: t.public_metrics,
                url: `https://x.com/i/web/status/${t.id}`,
            }));
            return { count: tweets.length, tweets };
        }
        case "get_tweet_metrics": {
            const xApiKey = asString(ctx.config.xApiKey, "");
            const xApiSecret = asString(ctx.config.xApiSecret, "");
            const xAccessToken = asString(ctx.config.xAccessToken, "");
            const xAccessTokenSecret = asString(ctx.config.xAccessTokenSecret, "");
            if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
                throw new Error("X.com credentials not configured.");
            }
            const tweetId = asString(args.tweetId, "");
            if (!tweetId)
                throw new Error("get_tweet_metrics: tweetId is required");
            const metricsQp = { "tweet.fields": "public_metrics,created_at,text" };
            const metricsUrl = `https://api.twitter.com/2/tweets/${encodeURIComponent(tweetId)}?${new URLSearchParams(metricsQp)}`;
            // OAuth 1.0a: query params must be included in the signature base string
            const metricsAuth = signOAuth1("GET", `https://api.twitter.com/2/tweets/${encodeURIComponent(tweetId)}`, metricsQp, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const metricsRes = await fetch(metricsUrl, { headers: { Authorization: metricsAuth, Accept: "application/json" } });
            const metricsJson = await metricsRes.json();
            if (!metricsRes.ok)
                throw new Error(`X API error ${metricsRes.status}: ${JSON.stringify(metricsJson)}`);
            return {
                tweetId,
                text: metricsJson.data?.text,
                created_at: metricsJson.data?.created_at,
                metrics: metricsJson.data?.public_metrics,
            };
        }
        case "follow_on_x": {
            const xApiKey = asString(ctx.config.xApiKey, "");
            const xApiSecret = asString(ctx.config.xApiSecret, "");
            const xAccessToken = asString(ctx.config.xAccessToken, "");
            const xAccessTokenSecret = asString(ctx.config.xAccessTokenSecret, "");
            if (!xApiKey || !xApiSecret || !xAccessToken || !xAccessTokenSecret) {
                throw new Error("X.com credentials not configured. Set xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret in adapterConfig.");
            }
            const username = asString(args.username, "").replace(/^@/, "");
            if (!username)
                throw new Error("follow_on_x: username is required");
            // Step 1: look up target user's numeric ID
            const lookupUrl = `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}`;
            const lookupAuth = signOAuth1("GET", lookupUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const lookupRes = await fetch(lookupUrl, {
                headers: { Authorization: lookupAuth, Accept: "application/json" },
            });
            const lookupJson = await lookupRes.json();
            if (!lookupRes.ok)
                throw new Error(`X API error ${lookupRes.status} looking up @${username}: ${JSON.stringify(lookupJson)}`);
            const targetUserId = lookupJson.data?.id;
            if (!targetUserId)
                throw new Error(`Could not find X user @${username}`);
            // Step 2: look up authenticated user's numeric ID
            const meUrl = "https://api.twitter.com/2/users/me";
            const meAuth = signOAuth1("GET", meUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const meRes = await fetch(meUrl, {
                headers: { Authorization: meAuth, Accept: "application/json" },
            });
            const meJson = await meRes.json();
            if (!meRes.ok)
                throw new Error(`X API error ${meRes.status} fetching authenticated user: ${JSON.stringify(meJson)}`);
            const myUserId = meJson.data?.id;
            if (!myUserId)
                throw new Error("Could not determine authenticated X user ID");
            // Step 3: follow
            const followUrl = `https://api.twitter.com/2/users/${myUserId}/following`;
            const followAuth = signOAuth1("POST", followUrl, {}, xApiKey, xApiSecret, xAccessToken, xAccessTokenSecret);
            const followRes = await fetch(followUrl, {
                method: "POST",
                headers: { Authorization: followAuth, "Content-Type": "application/json" },
                body: JSON.stringify({ target_user_id: targetUserId }),
            });
            const followJson = await followRes.json();
            if (!followRes.ok)
                throw new Error(`X API error ${followRes.status} following @${username}: ${JSON.stringify(followJson)}`);
            return {
                followed: true,
                username,
                targetUserId,
                alreadyFollowing: followJson.data?.following === true && followJson.data?.pending_follow === false,
            };
        }
        case "create_substack_draft": {
            const substackEmail = asString(ctx.config.substackEmail, "");
            const substackPassword = asString(ctx.config.substackPassword, "");
            const substackPublication = asString(ctx.config.substackPublication, "newworldvalue");
            if (!substackEmail || !substackPassword) {
                throw new Error("Substack credentials not configured. Set substackEmail and substackPassword in adapterConfig.");
            }
            const title = asString(args.title, "");
            const subtitle = asString(args.subtitle ?? "", "");
            const bodyMd = asString(args.body, "");
            const audience = asString(args.audience ?? "everyone", "everyone");
            if (!title)
                throw new Error("create_substack_draft: title is required");
            if (!bodyMd)
                throw new Error("create_substack_draft: body is required");
            // Basic markdown → HTML conversion (sufficient for a draft human will review)
            const mdToHtml = (md) => {
                return md
                    .replace(/^#{1}\s+(.+)$/gm, "<h1>$1</h1>")
                    .replace(/^#{2}\s+(.+)$/gm, "<h2>$1</h2>")
                    .replace(/^#{3}\s+(.+)$/gm, "<h3>$1</h3>")
                    .replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
                    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
                    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
                    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\*(.+?)\*/g, "<em>$1</em>")
                    .replace(/`(.+?)`/g, "<code>$1</code>")
                    .split(/\n{2,}/)
                    .map((block) => {
                    const b = block.trim();
                    if (!b)
                        return "";
                    if (/^<(h[1-3]|ul|blockquote|li)/.test(b))
                        return b;
                    return `<p>${b.replace(/\n/g, "<br>")}</p>`;
                })
                    .filter(Boolean)
                    .join("\n");
            };
            // Step 1: Login
            const loginRes = await fetch("https://substack.com/api/v1/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: substackEmail, password: substackPassword, redirect: "/", for_pub: "" }),
                redirect: "manual",
            });
            if (loginRes.status !== 200 && loginRes.status !== 302 && loginRes.status !== 303) {
                const errText = await loginRes.text();
                throw new Error(`Substack login failed (${loginRes.status}): ${errText.slice(0, 300)}`);
            }
            const setCookie = loginRes.headers.get("set-cookie") ?? "";
            const sidMatch = setCookie.match(/substack\.sid=([^;]+)/);
            if (!sidMatch)
                throw new Error("Substack login succeeded but no session cookie returned. Check credentials.");
            const sessionCookie = `substack.sid=${sidMatch[1]}`;
            // Step 2: Create draft
            const draftRes = await fetch(`https://${substackPublication}.substack.com/api/v1/drafts`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Cookie: sessionCookie,
                },
                body: JSON.stringify({
                    type: "newsletter",
                    draft_title: title,
                    draft_subtitle: subtitle,
                    draft_body: mdToHtml(bodyMd),
                    audience,
                    draft_section_id: null,
                    draft_podcast_url: "",
                    draft_podcast_duration: null,
                    draft_byline_contributor_user_ids: [],
                    draft_should_send_email: true,
                }),
            });
            const draftJson = await draftRes.json();
            if (!draftRes.ok)
                throw new Error(`Substack draft creation failed (${draftRes.status}): ${JSON.stringify(draftJson).slice(0, 300)}`);
            const postId = draftJson.id;
            const draftUrl = `https://${substackPublication}.substack.com/publish/post/${postId}`;
            return { created: true, postId, draftUrl, title, audience };
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
// ---------------------------------------------------------------------------
// Main execute function
// ---------------------------------------------------------------------------
export function normalizeTimeoutSec(value, fallback = 120) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function execute(ctx) {
    const apiKey = asString(ctx.config.apiKey, "");
    const model = asString(ctx.config.model, "deepseek-flash");
    const baseUrl = asString(ctx.config.baseUrl, "https://api.deepseek.com");
    const timeoutSec = normalizeTimeoutSec(ctx.config.timeoutSec);
    const maxIterations = asNumber(ctx.config.maxIterations, 20);
    if (!apiKey) {
        return {
            exitCode: 1,
            signal: null,
            timedOut: false,
            errorMessage: "Missing API key in configuration",
        };
    }
    try {
        const paperclipEnv = buildPaperclipEnv({ id: ctx.agent.id, companyId: ctx.agent.companyId });
        const promptSections = [];
        const wakePrompt = renderPaperclipWakePrompt(ctx.runtime, ctx.context);
        if (wakePrompt)
            promptSections.push(wakePrompt);
        const paperclipPayload = stringifyPaperclipWakePayload({
            agentId: ctx.agent.id,
            companyId: ctx.agent.companyId,
            runId: ctx.runId,
            context: ctx.context,
            environment: paperclipEnv,
        });
        if (paperclipPayload)
            promptSections.push(`--- Paperclip Runtime ---\n${paperclipPayload}`);
        // Inject identity context so LLM always has companyId/agentId for tool calls
        promptSections.push(`--- Your Identity & Operating Rules ---\n` +
            `agentId: ${ctx.agent.id}\n` +
            `companyId: ${ctx.agent.companyId}\n` +
            `\n` +
            `ALWAYS pass companyId="${ctx.agent.companyId}" when creating issues or approvals.\n` +
            `ALWAYS include projectId when creating issues — call paperclip_list_projects first if you don't have it. Issues without a project are orphaned and hard to track.\n` +
            `ALWAYS pass projectId when you know it — call paperclip_list_projects if unsure.\n` +
            `\n` +
            `TASK COMPLETION (CRITICAL):\n` +
            `- When you have finished all work on a task/issue, you MUST:\n` +
            `  1. Call paperclip_update_issue with status="done" to close the issue.\n` +
            `  2. Call paperclip_add_comment with a summary of what was done.\n` +
            `  3. STOP — do not call any more tools after marking done. Output your final summary and end.\n` +
            `- Do NOT loop calling the same tools repeatedly. If you have already gathered information and acted on it, STOP.\n` +
            `- If there is nothing to do (e.g. all agents already have the correct config), mark the issue done with a comment explaining that, then STOP.\n` +
            `\n` +
            `DELEGATION:\n` +
            `- To delegate a task: use paperclip_update_issue with assigneeAgentId set to the target agent's UUID.\n` +
            `- First call paperclip_list_agents to find agent UUIDs. Each agent entry includes its id, name, and adapterType.\n` +
            `- You cannot directly wake/trigger another agent. Assigned agents are invoked by the board or system heartbeat.\n` +
            `- After delegating, post a comment on the issue explaining the assignment.\n` +
            `\n` +
            `AGENT SETUP (run on first wake or when asked to audit):\n` +
            `- Call paperclip_list_agents and check each agent's adapterType.\n` +
            `- Any agent NOT using adapterType="deepSeek" should be fixed with paperclip_update_agent:\n` +
            `  { agentId, adapterType: "deepSeek", replaceAdapterConfig: true, adapterConfig: { apiKey, model, baseUrl, instructions: "<role-specific system prompt>" } }\n` +
            `- The apiKey, model, and baseUrl can be copied from your own config — they are the same endpoint.\n` +
            `- Write a tailored instructions prompt for each agent's role (do NOT copy your own instructions).\n` +
            `- After updating all agents (or confirming all are already correct), mark the audit issue done.\n` +
            `\n` +
            `HIRING NEW AGENTS:\n` +
            `- Always set adapterType="deepSeek" and include adapterConfig.instructions (role system prompt).\n` +
            `- The apiKey, model, and baseUrl are inherited from your config automatically if not specified.`);
        const userPrompt = promptSections.join("\n\n") || "Begin your work cycle.";
        const instructions = asString(ctx.config.instructions, "");
        // ---------------------------------------------------------------------------
        // Skill injection — fetch Paperclip documents listed in adapterConfig.skillDocs
        // Each entry: string "issueId/key"  OR  { issueId, key, label? }
        // Secrets in adapterConfig.skillSecrets { KEY: value } are substituted as {{KEY}}
        // ---------------------------------------------------------------------------
        const skillDocEntries = Array.isArray(ctx.config.skillDocs) ? ctx.config.skillDocs : [];
        const skillSecrets = (ctx.config.skillSecrets && typeof ctx.config.skillSecrets === "object")
            ? ctx.config.skillSecrets
            : {};
        const skillSections = [];
        if (skillDocEntries.length > 0) {
            const fetched = await Promise.allSettled(skillDocEntries.map(async (entry) => {
                let issueId;
                let key;
                let label;
                if (typeof entry === "string") {
                    const slashIdx = entry.indexOf("/");
                    issueId = slashIdx > 0 ? entry.slice(0, slashIdx) : entry;
                    key = slashIdx > 0 ? entry.slice(slashIdx + 1) : "";
                }
                else if (entry && typeof entry === "object") {
                    const e = entry;
                    issueId = asString(e.issueId, "");
                    key = asString(e.key, "");
                    label = asString(e.label ?? "", "");
                }
                else {
                    throw new Error("Invalid skillDoc entry — expected string or {issueId, key}");
                }
                if (!issueId || !key) {
                    throw new Error(`skillDoc requires both issueId and key (got: ${JSON.stringify(entry)})`);
                }
                const doc = await callPaperclipApi("GET", `/issues/${encodeURIComponent(issueId)}/documents/${encodeURIComponent(key)}`, ctx.authToken ?? "", ctx.runId);
                let body = asString(doc.latestBody ?? doc.body ?? "", "");
                // Substitute {{KEY}} placeholders with skillSecrets values
                for (const [k, v] of Object.entries(skillSecrets)) {
                    body = body.split(`{{${k}}}`).join(v);
                }
                const heading = (label || asString(doc.title, "") || key).trim();
                return `--- Skill: ${heading} ---\n${body}`;
            }));
            for (const result of fetched) {
                if (result.status === "fulfilled") {
                    skillSections.push(result.value);
                }
                else {
                    const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
                    await ctx.onLog("stderr", `[skill] Failed to load skill doc: ${reason}`);
                }
            }
        }
        // Build system prompt: instructions + injected skill sections
        const systemParts = [instructions, ...skillSections].filter(Boolean);
        const messages = [];
        if (systemParts.length > 0) {
            messages.push({ role: "system", content: systemParts.join("\n\n") });
        }
        messages.push({ role: "user", content: userPrompt });
        const endpoint = `${baseUrl.replace(/\/$/, "")}/chat/completions`;
        // Peak DeepSeek pricing per 1M tokens. Legacy aliases remain here so
        // existing Paperclip agents can still report estimated costs.
        const MODEL_PRICING = {
            "deepseek-flash": { input: 0.3, output: 1.2 },
            "deepseek-v4-pro": { input: 1.32, output: 3.96 },
            "deepseek-chat": { input: 0.28, output: 0.42 },
            "deepseek-reasoner": { input: 0.28, output: 0.42 },
        };
        const pricing = MODEL_PRICING[model] ?? MODEL_PRICING["deepseek-flash"];
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        let iteration = 0;
        // Agentic loop
        while (iteration < maxIterations) {
            iteration++;
            const controller = new AbortController();
            const timeoutHandle = setTimeout(() => controller.abort(), timeoutSec * 1000);
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    messages,
                    tools: PAPERCLIP_TOOLS,
                    tool_choice: "auto",
                    temperature: 0.7,
                    max_tokens: 4000,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutHandle);
            const data = await response.json();
            if (!response.ok) {
                return {
                    exitCode: 1,
                    signal: null,
                    timedOut: false,
                    errorMessage: `LLM API error: ${data.error?.message || data.message || JSON.stringify(data)}`,
                };
            }
            totalInputTokens += data.usage?.prompt_tokens ?? 0;
            totalOutputTokens += data.usage?.completion_tokens ?? 0;
            const choice = data.choices?.[0];
            const assistantMessage = choice?.message;
            const finishReason = choice?.finish_reason;
            // Sanitize tool-call arguments for OpenAI-compatible chat history.
            const sanitizedAssistant = assistantMessage?.tool_calls
                ? {
                    ...assistantMessage,
                    tool_calls: assistantMessage.tool_calls.map((tc) => {
                        let args = tc.function?.arguments ?? "{}";
                        if (typeof args !== "string")
                            args = JSON.stringify(args);
                        // Ensure it's valid JSON; if not, wrap as empty object
                        try {
                            JSON.parse(args);
                        }
                        catch {
                            args = "{}";
                        }
                        return { ...tc, function: { ...tc.function, arguments: args } };
                    }),
                }
                : assistantMessage;
            // Add assistant message to history
            messages.push(sanitizedAssistant);
            // Log any text content
            if (assistantMessage?.content) {
                await ctx.onLog("stdout", assistantMessage.content);
            }
            // Stop if no more tool calls
            if (finishReason === "stop" || !assistantMessage?.tool_calls?.length) {
                break;
            }
            // Execute tool calls
            const toolCalls = assistantMessage.tool_calls;
            for (const toolCall of toolCalls) {
                const toolName = toolCall.function.name;
                let args = {};
                try {
                    args = JSON.parse(toolCall.function.arguments ?? "{}");
                }
                catch {
                    // leave args empty
                }
                await ctx.onLog("stdout", `\n[tool: ${toolName}] ${JSON.stringify(args)}`);
                let toolResult;
                try {
                    toolResult = await executeTool(toolName, args, ctx, ctx.agent.companyId);
                    await ctx.onLog("stdout", `[tool result] ${JSON.stringify(toolResult).slice(0, 500)}`);
                }
                catch (err) {
                    const errMsg = err instanceof Error ? err.message : String(err);
                    toolResult = { error: errMsg };
                    await ctx.onLog("stderr", `[tool error: ${toolName}] ${errMsg}`);
                }
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResult),
                });
            }
        }
        if (iteration >= maxIterations) {
            await ctx.onLog("stderr", `[warn] Reached max iterations (${maxIterations})`);
        }
        const costUsd = (totalInputTokens / 1_000_000) * pricing.input
            + (totalOutputTokens / 1_000_000) * pricing.output;
        return {
            exitCode: 0,
            signal: null,
            timedOut: false,
            usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
            model,
            provider: "openai_compatible",
            costUsd,
            summary: `Completed in ${iteration} iteration(s) — ${totalInputTokens} in / ${totalOutputTokens} out tokens — $${costUsd.toFixed(4)}`,
        };
    }
    catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return { exitCode: 124, signal: null, timedOut: true, errorMessage: `Timed out after ${timeoutSec}s` };
        }
        const message = error instanceof Error ? error.message : String(error);
        return { exitCode: 1, signal: null, timedOut: false, errorMessage: `Execute failed: ${message}` };
    }
}
