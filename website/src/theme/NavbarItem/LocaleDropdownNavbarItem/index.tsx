import React, {type ReactNode} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {translate} from '@docusaurus/Translate';
import {mergeSearchStrings, useHistorySelector} from '@docusaurus/theme-common';
import {useLocation} from '@docusaurus/router';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import IconLanguage from '@theme/Icon/Language';
import type {LinkLikeNavbarItemProps} from '@theme/NavbarItem';
import {createLocaleUrl, inferCurrentLocaleBaseUrl} from './localeUtils';

import styles from './styles.module.css';

type Props = {
  mobile?: boolean;
  dropdownItemsBefore?: LinkLikeNavbarItemProps[];
  dropdownItemsAfter?: LinkLikeNavbarItemProps[];
  queryString?: string;
  [key: string]: unknown;
};

function useLocaleDropdownUtils() {
  const {
    siteConfig,
    i18n: {currentLocale, localeConfigs},
  } = useDocusaurusContext();
  const search = useHistorySelector((history) => history.location.search);
  const hash = useHistorySelector((history) => history.location.hash);
  const {pathname} = useLocation();
  const {baseUrl, trailingSlash, url: siteUrl} = siteConfig;

  const getLocaleConfig = (locale: string) => {
    const localeConfig = localeConfigs[locale];
    if (!localeConfig) {
      throw new Error(
        `Docusaurus bug, no locale config found for locale=${locale}`,
      );
    }
    return localeConfig;
  };

  const effectiveCurrentLocaleBaseUrl = inferCurrentLocaleBaseUrl({
    pathname,
    localeConfigs: localeConfigs as Record<string, { baseUrl: string }>,
    currentLocale,
  });

  return {
    getURL: (locale: string, options: {queryString: string | undefined}) => {
      const targetLocaleConfig = getLocaleConfig(locale);
      const baseUrlForLocale = createLocaleUrl({
        pathname,
        trailingSlash,
        siteBaseUrl: baseUrl,
        currentLocaleBaseUrl: effectiveCurrentLocaleBaseUrl,
        targetLocaleBaseUrl: targetLocaleConfig.baseUrl,
        targetLocaleUrl: targetLocaleConfig.url,
        siteUrl,
      });
      const finalSearch = mergeSearchStrings(
        [search, options.queryString],
        'append',
      );
      return `${baseUrlForLocale}${finalSearch}${hash}`;
    },
    getLabel: (locale: string) => {
      return getLocaleConfig(locale).label;
    },
    getLang: (locale: string) => {
      return getLocaleConfig(locale).htmlLang;
    },
  };
}

export default function LocaleDropdownNavbarItem({
  mobile,
  dropdownItemsBefore = [],
  dropdownItemsAfter = [],
  queryString,
  ...props
}: Props): ReactNode {
  const utils = useLocaleDropdownUtils();

  const {
    i18n: {currentLocale, locales},
  } = useDocusaurusContext();
  const localeItems = locales.map((locale): LinkLikeNavbarItemProps => {
    return {
      label: utils.getLabel(locale),
      lang: utils.getLang(locale),
      to: utils.getURL(locale, {queryString}),
      target: '_self',
      autoAddBaseUrl: false,
      className:
        locale === currentLocale
          ? mobile
            ? 'menu__link--active'
            : 'dropdown__link--active'
          : '',
    };
  });

  const items = [...dropdownItemsBefore, ...localeItems, ...dropdownItemsAfter];

  const dropdownLabel = mobile
    ? translate({
        message: 'Languages',
        id: 'theme.navbar.mobileLanguageDropdown.label',
        description: 'The label for the mobile language switcher dropdown',
      })
    : utils.getLabel(currentLocale);

  return (
    <DropdownNavbarItem
      {...props}
      mobile={mobile}
      label={
        <>
          <IconLanguage className={styles.iconLanguage} />
          {dropdownLabel}
        </>
      }
      items={items}
    />
  );
}
