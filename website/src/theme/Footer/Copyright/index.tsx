import React, { type ReactNode } from 'react';
import type { Props } from '@theme/Footer/Copyright';

function NpmDownloads() {
  return (
    <span className="footer__copyright-npm-link-wrap">
      <span className="footer__copyright-sep" aria-hidden="true">
        —
      </span>
      <a
        className="footer__copyright-npm-link"
        href="https://www.npmjs.com/package/@the-long-ride/engram"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          className="footer__copyright-npm-logo"
          viewBox="0 0 780 250"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M240,250h100v-50h100V0H240V250z M340,50h50v100h-50V50z M480,0v200h100V50h50v150h50V50h50v150h50V0H480z M0,200h100V50h50v150h50V0H0V200z"
            strokeWidth="5"
            stroke="var(--geist-bg-100)"
          />
        </svg>
        <span>@the-long-ride/engram</span>
      </a>
    </span>
  );
}

export default function FooterCopyright({ copyright }: Props): ReactNode {
  void copyright;
  const year = new Date().getFullYear();

  return (
    <div className="footer__copyright-shell">
      <div className="footer__copyright-line footer__copyright-line--meta">
        <span>Copyright © {year} the-long-ride</span>
      </div>
      <div className="footer__copyright-line footer__copyright-line--links">
        <a
          href="https://github.com/the-long-ride/engram/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          GPL-3.0 License
        </a>
        <span className="footer__copyright-sep" aria-hidden="true">
          —
        </span>
        <a
          href="https://github.com/the-long-ride/engram"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <span className="footer__copyright-sep" aria-hidden="true">
          —
        </span>
        <a
          href="https://github.com/the-long-ride/engram/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          Issues
        </a>
      </div>
      <div className="footer__copyright-line footer__copyright-line--npm">
        <NpmDownloads />
      </div>
    </div>
  );
}
