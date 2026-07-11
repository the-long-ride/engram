import React, {type ComponentProps, type ReactNode} from 'react';
import {useThemeConfig} from '@docusaurus/theme-common';
import {useNavbarSecondaryMenu} from '@docusaurus/theme-common/internal';
import Translate from '@docusaurus/Translate';
import useBaseUrl from '@docusaurus/useBaseUrl';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {useActiveDocContext} from '@docusaurus/plugin-content-docs/client';
import {DocPageCopyNavbarItemView} from '../../../../components/DocPageCopyNavbarItemView';

function SecondaryMenuBackButton(props: ComponentProps<'button'>) {
  return (
    <button {...props} type="button" className="clean-btn navbar-sidebar__back">
      <Translate
        id="theme.navbar.mobileSidebarSecondaryMenu.backButtonLabel"
        description="The label of the back button to return to main menu, inside the mobile navbar sidebar secondary menu (notably used to display the docs sidebar)">
        ← Back to main menu
      </Translate>
    </button>
  );
}

function NavbarDocCopyAction(): ReactNode {
  const {pathname} = useLocation();
  const baseUrl = useBaseUrl('/');
  const {siteConfig} = useDocusaurusContext();
  const {activeDoc} = useActiveDocContext('default');
  const locales = siteConfig.i18n?.locales ?? [];
  const defaultLocale = siteConfig.i18n?.defaultLocale ?? 'en';
  const docsCopy = siteConfig.customFields?.docsCopy as
    | {
        currentVersionPath?: string;
        publishedVersionName?: string;
      }
    | undefined;

  return (
    <DocPageCopyNavbarItemView
      pathname={pathname}
      baseUrl={baseUrl}
      locales={locales}
      defaultLocale={defaultLocale}
      currentVersionPath={docsCopy?.currentVersionPath}
      publishedVersionName={docsCopy?.publishedVersionName}
      hasActiveDoc={Boolean(activeDoc)}
      mobile
    />
  );
}

export default function NavbarMobileSidebarSecondaryMenu(): ReactNode {
  const isPrimaryMenuEmpty = useThemeConfig().navbar.items.length === 0;
  const secondaryMenu = useNavbarSecondaryMenu();
  return (
    <>
      {!isPrimaryMenuEmpty && (
        <>
          <SecondaryMenuBackButton onClick={() => secondaryMenu.hide()} />
          <NavbarDocCopyAction />
        </>
      )}
      {secondaryMenu.content}
    </>
  );
}
