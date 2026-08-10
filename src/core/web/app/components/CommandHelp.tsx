import { HelpLink } from './HelpLink.js';

export function CommandHelp({ href, label, command }: { href: string; label: string; command: string }) {
  return <span className="command-help">
    <HelpLink href={href} label={label} />
    <span className="command-help-copy">CLI: <code>{command}</code></span>
  </span>;
}
