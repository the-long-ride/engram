import React, {type ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useThemeConfig, type NavbarLogo} from '@docusaurus/theme-common';
import ThemedImage from '@theme/ThemedImage';
import type {Props} from '@theme/Logo';

/**
 * The root site baseUrl (without any locale prefix).
 * Hardcoded here so the logo image src never changes regardless of the active locale.
 * If you change `baseUrl` in docusaurus.config.ts, update this constant too.
 */
const SITE_ROOT_BASE_URL = '/engram/';

/**
 * Build a logo image URL that is always relative to the root site base URL,
 * ignoring the current locale. Prevents the locale segment (e.g. /ja/)
 * from being prepended to the logo src when the user switches language.
 */
function useStaticLogoUrl(src: string | undefined): string {
  if (!src) return '';
  // If already absolute (http/https), use as-is
  if (/^https?:\/\//.test(src)) return src;
  // Strip any leading slash from src and join with the fixed root base URL
  const cleanSrc = src.replace(/^\/+/, '');
  return `${SITE_ROOT_BASE_URL}${cleanSrc}`;
}

function LogoThemedImage({
  logo,
  alt,
  imageClassName,
}: {
  logo: NavbarLogo;
  alt: string;
  imageClassName?: string;
}) {
  // Use static, locale-independent URLs for the logo images
  const sources = {
    light: useStaticLogoUrl(logo.src),
    dark: useStaticLogoUrl(logo.srcDark || logo.src),
  };
  const themedImage = (
    <ThemedImage
      className={logo.className}
      sources={sources}
      height={logo.height}
      width={logo.width}
      alt={alt}
      style={logo.style}
    />
  );

  // Is this extra div really necessary?
  // introduced in https://github.com/facebook/docusaurus/pull/5666
  return imageClassName ? (
    <div className={imageClassName}>{themedImage}</div>
  ) : (
    themedImage
  );
}

export default function Logo(props: Props): ReactNode {
  const {
    siteConfig: {title},
  } = useDocusaurusContext();
  const {
    navbar: {title: navbarTitle, logo},
  } = useThemeConfig();

  const {imageClassName, titleClassName, ...propsRest} = props;
  const logoLink = useBaseUrl(logo?.href || '/');

  // If visible title is shown, fallback alt text should be
  // an empty string to mark the logo as decorative.
  const fallbackAlt = navbarTitle ? '' : title;

  // Use logo alt text if provided (including empty string),
  // and provide a sensible fallback otherwise.
  const alt = logo?.alt ?? fallbackAlt;

  return (
    <Link
      to={logoLink}
      {...propsRest}
      {...(logo?.target && {target: logo.target})}>
      {logo && (
        <LogoThemedImage
          logo={logo}
          alt={alt}
          imageClassName={imageClassName}
        />
      )}
      {navbarTitle != null && <b className={titleClassName}>{navbarTitle}</b>}
    </Link>
  );
}
