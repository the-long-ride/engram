import React, { type ReactNode } from 'react';
import type { Props } from '@theme/Footer/Copyright';

function NpmDownloads() {
  return (
    <>
      <span style={{ margin: '0 4px', color: 'var(--geist-gray-500)' }}>—</span>
      <a
        href="https://www.npmjs.com/package/@the-long-ride/engram"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          verticalAlign: 'middle',
        }}
      >
        {/* npm logo svg */}
        <svg 
          viewBox="0 0 780 250" 
          aria-hidden="true" 
          style={{ 
            height: '10px', 
            width: 'auto', 
            fill: 'currentColor', 
            color: 'var(--npm-logo-color)',
            position: 'relative',
            top: '1px'
          }}
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
    </>
  );
}

export default function FooterCopyright({ copyright }: Props): ReactNode {
  return (
    <div className="footer__copyright" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4px' }}>
      <span dangerouslySetInnerHTML={{ __html: copyright }} />
      <NpmDownloads />
    </div>
  );
}
