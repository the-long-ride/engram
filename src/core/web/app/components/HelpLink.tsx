export function HelpLink({ href, label, className = '' }: { href: string; label: string; className?: string }) {
  return <a className={'help-link ' + className} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} onClick={(event) => event.stopPropagation()}>i</a>;
}
