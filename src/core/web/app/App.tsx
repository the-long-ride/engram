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
import { RuntimeTab } from './tabs/RuntimeTab.js';
import { CoreTab } from './tabs/CoreTab.js';
import { MemoriesTab } from './tabs/MemoriesTab.js';
import { ProfilesTab } from './tabs/ProfilesTab.js';
import { WorkspacesTab } from './tabs/WorkspacesTab.js';
import { ConnectionsTab } from './tabs/ConnectionsTab.js';

export function App() {
  const [data, setData] = useState<PanelData | null>(null);
  const [active, setActiveState] = useState<TabName>('config');
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

  const setActive = (tab: TabName) => { setActiveState(tab); setSidebarOpen(false); };
  const toggleTheme = async () => {
    if (!data) return;
    const nextTheme = dark ? 'light' : 'dark';
    setData({ ...data, config: { ...(data.config || {}), theme: nextTheme } });
    try { const { saveConfigPatch } = await import('./api-client.js'); await saveConfigPatch({ theme: nextTheme }); } catch (e: any) { toast(e.message, false); }
  };
  const init = async () => { try { const res = await initializeWorkspace(); toast(res.message || 'Workspace initialized'); await reload(); } catch (e: any) { toast(e.message, false); } };
  const shutdown = async () => { try { await shutdownServer(); toast('Server closing'); } catch (e: any) { toast(e.message, false); } };
  const modalApi = useMemo<ModalController>(() => ({ open: setModal, close: () => setModal(null) }), []);
  const panes = useMemo(() => ({ config: data ? <ConfigTab data={data} reload={reload} toast={toast} /> : null, runtime: data ? <RuntimeTab data={data} toast={toast} /> : null, core: <CoreTab active={active === 'core'} toast={toast} modal={modalApi} />, memories: <MemoriesTab active={active === 'memories'} toast={toast} modal={modalApi} />, profiles: data ? <ProfilesTab data={data} reload={reload} toast={toast} /> : null, workspaces: data ? <WorkspacesTab data={data} reload={reload} toast={toast} /> : null, connection: <ConnectionsTab active={active === 'connection'} toast={toast} /> }), [data, active, reload, toast, modalApi]);

  return <div className={'app' + (sidebarOpen ? ' sb-open' : '')}>
    <Sidebar data={data} active={active} setActive={setActive} dark={dark} toggleTheme={toggleTheme} shutdown={shutdown} toast={toast} />
    <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
    <div className="main" id="main"><MobileHeader toggleSidebar={() => setSidebarOpen((open) => !open)} />
      <InitBanner show={Boolean(data && data.isInitialized === false)} init={init} />
      {error ? <div className="loading" style={{ color: 'var(--red)', flexDirection: 'column', gap: 12 }}><span>{error}</span><button className="btn btn-outline" onClick={reload}>Retry</button></div> : data ? (Object.keys(panes) as TabName[]).map((tab) => <div key={tab} className={'tab-pane' + (active === tab ? ' active' : '')} id={'tab-' + tab}>{panes[tab]}</div>) : <Loading />}
    </div>
    <Toast toast={toastState} />
    <Modal modal={modal} close={() => setModal(null)} toast={toast} />
  </div>;
}

