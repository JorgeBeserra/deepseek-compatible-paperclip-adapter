# DeepSeek-compatible Paperclip Adapter

Adapter externo para conectar agentes do Paperclip à API da DeepSeek por meio do formato compatível com OpenAI.

## Instalação

No Paperclip, abra **Settings → Adapters → External** e instale o pacote:

```text
deepseek-compatible-paperclip-adapter
```

Alternativamente, configure `~/.paperclip/adapter-plugins.json`:

```json
[
  {
    "package": "deepseek-compatible-paperclip-adapter"
  }
]
```

Reinicie/recarregue o Paperclip depois da instalação. O pacote publicado deve conter a pasta `dist/`; ao compilar a partir do código-fonte, execute `npm install` e `npm run build`.

## Configuração do agente

Selecione o tipo de adaptador `openai_compatible_api` e configure `adapterConfig`:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `apiKey` | Sim | Chave da API do provedor. Para endpoints locais sem autenticação, use um valor qualquer se o endpoint aceitar isso. |
| `model` | Sim | ID do modelo fornecido pelo provedor. |
| `baseUrl` | Não | URL raiz da API compatível com OpenAI. |
| `timeoutSec` | Não | Tempo limite em segundos; padrão 120. |
| `instructions` | Não | Instruções de sistema do agente. |

### DeepSeek

```json
{
  "apiKey": "SUA_CHAVE_DEEPSEEK",
  "model": "deepseek-chat",
  "baseUrl": "https://api.deepseek.com"
}
```

Se o provedor exigir o caminho `/v1`, use `https://api.deepseek.com/v1`. A URL precisa corresponder ao formato aceito pelo provedor; o adaptador acrescenta o caminho de chat completions.

## Desenvolvimento

```bash
npm install
npm run build
npm run typecheck
npm test
```

O build compila os arquivos JavaScript de `src/` para `dist/`, que é o diretório publicado pelo pacote.

## Observações

- O adaptador usa a interface de chat completions da DeepSeek e um loop de execução de ferramentas.
- O modelo precisa suportar chamadas de ferramentas/function calling para executar ferramentas do Paperclip.
- Nunca coloque chaves reais em commits, logs ou arquivos públicos.
- Se o adaptador não aparecer, verifique o log do servidor do Paperclip e confirme que a versão instalada do pacote é a esperada.

## Licença

MIT
