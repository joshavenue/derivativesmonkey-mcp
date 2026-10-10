import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { authStatus, getAccessToken, isLoggedInLocally } from "./auth.js";
import { setTokenProvider } from "./client.js";
import { GUIDE_DESCRIPTION, GUIDE_MD } from "./guide.js";
import { rawSchemasRequested, sanitizeInputSchema } from "./sanitize.js";
import { registerDomainTools } from "./tools/domain.js";
import { getCoverage, registerMetaTools } from "./tools/meta.js";

export const SERVER_NAME = "derivativesmonkey-mcp";
export const SERVER_VERSION = "0.1.0";

export const GUIDE_PROMPT = "dm_guide";
export const GUIDE_URI = "dm://guide";
export const COVERAGE_URI = "dm://coverage";

/** Server instructions (<= 600 chars: some clients truncate or drop longer ones). */
export const INSTRUCTIONS =
  "Read-only tools for www.derivativesmonkey.com crypto options analytics: chains, IV term structure/smile/skew, realized vol, dealer GEX and greeks, open interest, options flow and block/RFQ trades, cross-venue divergence, futures basis/funding, order flow, quant models, strategy ideas, IBIT options and a backtester. Each dm_* tool takes a `view`. Call dm_coverage (with `topic`) if unsure. Cite `shownOn`/`source` and `fetchedAtIso`. For tool-selection rules read prompt dm_guide.";

setTokenProvider(getAccessToken, isLoggedInLocally);

/** tools/list returns portable schemas (see sanitize.ts); argument validation still uses zod. */
function installPortableToolList(server: McpServer): void {
  if (rawSchemasRequested()) return;
  const inner = server.server;
  const original = inner.setRequestHandler.bind(inner);
  inner.setRequestHandler = ((schema: unknown, handler: (...a: any[]) => unknown) => {
    if (schema !== ListToolsRequestSchema) return original(schema as any, handler as any);
    return original(ListToolsRequestSchema, async (req: any, extra: any) => {
      const res = (await handler(req, extra)) as { tools: Array<{ inputSchema: unknown; execution?: unknown }> };
      return {
        ...res,
        tools: res.tools.map((t) => {
          const { execution: _execution, ...rest } = t;
          return { ...rest, inputSchema: sanitizeInputSchema(t.inputSchema) };
        }),
      };
    });
  }) as typeof inner.setRequestHandler;
}

export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION }, { instructions: INSTRUCTIONS });
  installPortableToolList(server);
  registerMetaTools(server);
  registerDomainTools(server);

  server.registerPrompt(
    GUIDE_PROMPT,
    { title: "Derivatives Monkey tool-selection guide", description: `Rules for answering options questions with the dm_* tools. ${GUIDE_DESCRIPTION}`.slice(0, 1000) },
    () => ({ description: "Derivatives Monkey guide (skills/derivativesmonkey/SKILL.md)", messages: [{ role: "user", content: { type: "text", text: GUIDE_MD } }] }),
  );
  server.registerResource(
    "dm_guide",
    GUIDE_URI,
    { title: "Derivatives Monkey guide", description: "Same text as the dm_guide prompt.", mimeType: "text/markdown" },
    (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: GUIDE_MD }] }),
  );
  server.registerResource(
    "dm_coverage",
    COVERAGE_URI,
    { title: "Derivatives Monkey coverage map", description: "Tools, views, site pages, conventions and known issues (same as dm_coverage).", mimeType: "application/json" },
    (uri) => ({ contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify(getCoverage(), null, 2) }] }),
  );
  return server;
}

export { authStatus };
