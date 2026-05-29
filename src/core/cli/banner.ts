/** Small CLI identity banners. */
export const INIT_WORDMARK = `

     █████████╗███╗   ██╗ ██████╗ ██████╗  █████╗ ███╗   ███╗
     ╚════════╝████╗  ██║██╔════╝ ██╔══██╗██╔══██╗████╗ ████║
     ████████╗ ██╔██╗ ██║██║  ███╗██████╔╝██║  ██║██╔████╔██║
     ╚═══════╝ ██║╚██╗██║██║   ██║██╔══██╗██║  ██║██║╚██╔╝██║
     █████████╗██║ ╚████║╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║
     ╚════════╝╚═╝  ╚═══╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   SYNTHETIC MEMORY // NEURAL ARCHIVE :: @the-long-ride with <3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

/** Render the init wordmark, optionally in bright cyan for terminal use. */
export function renderInitWordmark(colored = false): string {
  if (!colored) return INIT_WORDMARK;
  return INIT_WORDMARK.split('\n').map((line) => line ? `\x1b[1;36m${line}\x1b[0m` : line).join('\n');
}
