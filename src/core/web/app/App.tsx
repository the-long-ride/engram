// Root React control panel application and cross-tab state.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ModalController, ModalState, PanelData, TabName, ToastState } from './types.js';
import { initializeWorkspace, loadPanelData, shutdownServer } from './api-client.js';
import { Sidebar } from './layout/Sidebar.js';
import { MobileHeader } from './layout/MobileHeader.js';
import { InitBanner } from './layout/InitBanner.js';
import { Toast } from './components/Toast.js';
import { Modal } from './components/Modal.js';
import { Loading } from './components/Loading.js';
import { ConfigTab } from './tabs/ConfigTab.js';
import { CoreTab } from './tabs/CoreTab.js';
import { MemoriesTab } from './tabs/MemoriesTab.js';
import { ConnectionsTab } from './tabs/ConnectionsTab.js';
import { ReviewTab } from './tabs/ReviewTab.js';
import { AuthorTab } from './tabs/AuthorTab.js';
import { UpgradeTab } from './tabs/UpgradeTab.js';

type ConfigSubView = 'config' | 'profiles' | 'workspaces' | 'runtime';
const VALID_TABS: readonly TabName[] = ['config', 'author', 'upgrade', 'recall', 'review', 'maintain', 'connect'];

function parseHash(): { tab: TabName; subView?: ConfigSubView } {
  if (typeof window === 'undefined') return { tab: 'config' };
  const raw = window.location.hash.replace(/^#\/?/, '').trim();
  if (!raw) return { tab: 'config' };
  const [head, sub] = raw.split('/');
  const tab = (VALID_TABS as readonly string[]).includes(head) ? (head as TabName) : 'config';
  const subView = tab === 'config' && (sub === 'config' || sub === 'profiles' || sub === 'workspaces' || sub === 'runtime') ? sub : undefined;
  return { tab, subView };
}

export function App() {
  const initialHash = useMemo(() => parseHash(), []);
  const [data, setData] = useState<PanelData | null>(null);
  const [active, setActiveState] = useState<TabName>(initialHash.tab);
  const [configSubView, setConfigSubView] = useState<ConfigSubView | undefined>(initialHash.subView);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [error, setError] = useState('');
  const dark = (data?.config?.theme || 'dark') !== 'light';

  const toast = useCallback((message: string, ok = true) => {
    const id = Date.now();
    setToastState({ message, ok, id });
    window.setTimeout(() => setToastState((current) => current?.id === id ? null : current), 3200);
  }, []);

  const reload = useCallback(async () => {
    try {
      const next = await loadPanelData();
      setData(next);
      setError('');
    } catch (e: any) {
      setError('Load failed: ' + e.message);
      toast('Load failed: ' + e.message, false);
    }
  }, [toast]);

  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { document.documentElement.classList.toggle('light', !dark); }, [dark]);
  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash();
      setActiveState(parsed.tab);
      setConfigSubView(parsed.subView);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  const setActive = (tab: TabName) => {
    setActiveState(tab);
    setSidebarOpen(false);
    if (typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState(null, '', '#' + tab);
    }
  };
  const toggleTheme = async () => {
    if (!data) return;
    const nextTheme = dark ? 'light' : 'dark';
    setData({ ...data, config: { ...(data.config || {}), theme: nextTheme } });
    try { const { saveConfigPatch } = await import('./api-client.js'); await saveConfigPatch({ theme: nextTheme }); } catch (e: any) { toast(e.message, false); }
  };
  const init = async () => { try { const res = await initializeWorkspace(); toast(res.message || 'Workspace initialized'); await reload(); } catch (e: any) { toast(e.message, false); } };
  const shutdown = async () => { try { await shutdownServer(); toast('Server closing'); } catch (e: any) { toast(e.message, false); } };
  const modalApi = useMemo<ModalController>(() => ({ open: setModal, close: () => setModal(null) }), []);
  const pane = useMemo(() => {
    if (active === 'review') return <ReviewTab active toast={toast} modal={modalApi} />;
    if (active === 'maintain') return <CoreTab active toast={toast} modal={modalApi} />;
    if (active === 'connect') return <ConnectionsTab active toast={toast} modal={modalApi} />;
    if (active === 'config') return data ? <ConfigTab data={data} reload={reload} toast={toast} initialSubView={configSubView} /> : null;
    if (active === 'author') return data ? <AuthorTab data={data} reload={reload} toast={toast} modal={modalApi} /> : null;
    if (active === 'upgrade') return data ? <UpgradeTab data={data} reload={reload} toast={toast} modal={modalApi} /> : null;
    return <MemoriesTab active toast={toast} modal={modalApi} />;
  }, [data, active, configSubView, reload, toast, modalApi]);

  return <div className={'app' + (sidebarOpen ? ' sb-open' : '')}>
    <Sidebar data={data} active={active} setActive={setActive} dark={dark} toggleTheme={toggleTheme} shutdown={shutdown} toast={toast} onClose={() => setSidebarOpen(false)} />
    <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
    <div className="main" id="main"><MobileHeader toggleSidebar={() => setSidebarOpen((open) => !open)} />
      <InitBanner show={Boolean(data && data.isInitialized === false)} init={init} />
      {error ? <div className="loading" style={{ color: 'var(--red)', flexDirection: 'column', gap: 12 }}><span>{error}</span><button className="btn btn-outline" onClick={reload}>Retry</button></div> : data ? <div className="tab-pane active" id={'tab-' + active}>{pane}</div> : <Loading />}
    </div>
    <Toast toast={toastState} />
    <Modal modal={modal} close={() => setModal(null)} toast={toast} />
  </div>;
}
