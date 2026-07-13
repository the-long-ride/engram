/** Render the host capability registry for humans and stable JSON consumers. */
import { isJsonMode, jsonOk } from '../core/cli/json-output.js';
import { adapterCapabilities } from '../core/integrations/capabilities.js';
export async function cmdCapabilities(args: string[], flags: Record<string, any> = {}): Promise<string> {
  const data = adapterCapabilities(args[0]);
  return isJsonMode(flags) ? jsonOk({ capabilities: data }) : data.map((item) => `${item.host}: instruction=${item.instruction} skillset=${item.skillset} mcp=${item.mcp} startup=${item.startup_injection} prompt_turn=${item.prompt_turn_injection} proof=${item.proof} transcript=${item.transcript_events} unlink=${item.unlink_cleanup}`).join('\n');
}
