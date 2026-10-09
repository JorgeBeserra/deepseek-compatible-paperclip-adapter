# @bbugs280/openai-compatible-paperclip-adapter

A [Paperclip](https://github.com/paperclipai/paperclip) adapter that connects agents to any OpenAI-compatible LLM API — Dashscope (Qwen), DeepSeek, OpenRouter, Ollama, and more.

## Supported Providers

| Provider | Base URL |
|---|---|
| Dashscope (Qwen) | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| DeepSeek | `https://api.deepseek.com/v1` |
| OpenRouter | `https://openrouter.ai/api/v1` |
| Ollama (local) | `http://localhost:11434/v1` |
| Any OpenAI-compatible endpoint | your custom URL |

## Installation

Install via Paperclip's **Adapter Plugin Manager** (Settings → Adapters → External):

```
@bbugs280/openai-compatible-paperclip-adapter
```

Or add to `~/.paperclip/adapter-plugins.json`:

```json
[{ "package": "@bbugs280/openai-compatible-paperclip-adapter" }]
```

## Agent Configuration

When creating or editing an agent, select **OpenAI-Compatible API** as the adapter type and fill in:

| Field | Required | Description |
|---|---|---|
| `apiKey` | Yes | Your provider API key (e.g. `sk-...`) |
| `model` | Yes | Model ID as the provider lists it (e.g. `qwen-plus`, `deepseek-chat`, `llama3`) |
| `baseUrl` | No | API endpoint root (default: Dashscope) |
| `timeoutSec` | No | Request timeout in seconds (default: 120) |
| `maxIterations` | No | Max tool-call iterations per run (default: 50) |
| `instructions` | No | System prompt — the agent's role, persona, and rules |

### System Prompt (instructions)

The **System Prompt** field is how you configure your agent's identity and behavior. It is sent as the `system` role message on every API call, before the task context.

Use this field the same way you would use an `AGENTS.md` or `CLAUDE.md` file with a local adapter. Paste your agent's role description, operating rules, output format requirements, and any standing instructions here.

**Example:**

```
You are a helpful assistant.

Purpose:
- Give concise, practical guidance
- Turn requests into simple, actionable steps
- Keep responses clear and easy to follow
- Ask for clarification when a blocker appears

When responding:
- Be short and direct
- Use bullet points for action items
- Briefly restate the task before acting
```

The system prompt is stored in the database as part of `adapterConfig` — it is included in any database backup.

> **Note:** Unlike local adapters (Claude CLI, Codex), this adapter does not use the Instructions tab. The Instructions tab manages on-disk files read by agent processes — which does not apply to API-based adapters. The System Prompt field here is the equivalent.

### Dashscope / Qwen example

```json
{
  "apiKey": "sk-your-dashscope-key",
  "model": "qwen-plus",
  "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "instructions": "You are a senior editor. Review tasks carefully and provide structured feedback."
}
```

### DeepSeek example

```json
{
  "apiKey": "sk-your-deepseek-key",
  "model": "deepseek-chat",
  "baseUrl": "https://api.deepseek.com/v1"
}
```

### Ollama (local, no key needed)

```json
{
  "apiKey": "any",
  "model": "llama3",
  "baseUrl": "http://localhost:11434/v1"
}
```

## Built-in Models (dropdown)

- `qwen-plus` — Qwen Plus
- `qwen3.5-plus` — Qwen 3.5 Plus
- `qwen-turbo` — Qwen Turbo
- `qwen-max` — Qwen Max

Any model ID supported by your provider can be typed manually.

## Built-in Tools

Beyond the standard Paperclip control-plane tools (list issues, create issue, add comment, etc.), this adapter ships optional social/publishing tools that agents can call during a run.

### X.com (Twitter) Tools

Configure by adding X developer credentials to the agent's `adapterConfig`:

| Field | Description |
|---|---|
| `xApiKey` | API Key (Consumer Key) from your X developer app |
| `xApiSecret` | API Key Secret (Consumer Secret) |
| `xAccessToken` | Access Token (generated in Keys and Tokens tab) |
| `xAccessTokenSecret` | Access Token Secret |

> Your X app must have **Read and Write** permissions, and Access Token/Secret must be regenerated after enabling write permissions.

Available tools:

| Tool | Description |
|---|---|
| `post_to_x` | Post a single tweet or a thread (array of texts) |
| `follow_on_x` | Follow a user by handle (e.g. `@paperclipai`) |
| `reply_to_x` | Reply to a tweet by ID |
| `like_tweet` | Like a tweet by ID |
| `retweet` | Retweet a tweet by ID |
| `search_x` | Search recent tweets by query |
| `get_tweet_metrics` | Get public engagement metrics for a tweet by ID |

### Substack Tool

Configure by adding Substack credentials:

| Field | Description |
|---|---|
| `substackEmail` | Login email for your Substack account |
| `substackPassword` | Login password |
| `substackPublication` | Subdomain of your publication (e.g. `mypublication` for `myPublication.substack.com`) |

Available tool:

| Tool | Description |
|---|---|
| `create_substack_draft` | Create a draft post from a title + markdown body. Returns the draft URL. |

## Skill Documents

Skills let you inject reusable reference content (style guides, brand voice, operating rules) into the agent's system prompt at run time, pulling the content from Paperclip document records.

Configure via `adapterConfig`:

| Field | Description |
|---|---|
| `skillDocs` | JSON array of `{ "issueId", "key", "label"? }` entries |
| `skillSecrets` | JSON object of `{ "KEY": "value" }` — substituted as `{{KEY}}` placeholders inside skill bodies |

**Example `skillDocs`:**

```json
[
  { "issueId": "558deb85-c81e-4632-8d16-9e440c676d51", "key": "writing-style", "label": "Brand Voice" },
  { "issueId": "558deb85-c81e-4632-8d16-9e440c676d51", "key": "xcom-content", "label": "X.com Guide" }
]
```

Each document is fetched via the Paperclip API and appended to the system prompt under a `--- Skill: <label> ---` heading. `{{KEY}}` placeholders in the document body are replaced with values from `skillSecrets`.

## How It Works

Each time an agent run is triggered, the adapter:

1. Fetches any configured skill documents and injects them into the system prompt
2. Builds a prompt from the Paperclip task context (issue, instructions, runtime info)
3. Calls `POST {baseUrl}/chat/completions` with OpenAI message format
4. Runs a tool-call loop — executes Paperclip + social tools as requested by the model
5. Returns the final response text as the run output

## License

MIT
