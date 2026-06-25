import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { InitBanner } from '../../src/core/web/app/layout/InitBanner.js';
import { MobileHeader } from '../../src/core/web/app/layout/MobileHeader.js';
import { Sidebar } from '../../src/core/web/app/layout/Sidebar.js';

describe('InitBanner', () => {
  test('renders when show is true and calls init', () => {
    const initMock = jest.fn();
    const { rerender } = render(<InitBanner show={false} init={initMock} />);
    expect(screen.queryByText('Workspace Not Initialized')).not.toBeInTheDocument();

    rerender(<InitBanner show={true} init={initMock} />);
    expect(screen.getByText('Workspace Not Initialized')).toBeInTheDocument();
    
    const initBtn = screen.getByRole('button', { name: 'Initialize Workspace' });
    fireEvent.click(initBtn);
    expect(initMock).toHaveBeenCalledTimes(1);
  });
});

describe('MobileHeader', () => {
  test('renders title and handles toggle click', () => {
    const toggleMock = jest.fn();
    render(<MobileHeader toggleSidebar={toggleMock} />);
    
    expect(screen.getByText('Engram')).toBeInTheDocument();
    const menuBtn = screen.getByRole('button', { name: 'Toggle Menu' });
    fireEvent.click(menuBtn);
    expect(toggleMock).toHaveBeenCalledTimes(1);
  });
});

describe('Sidebar', () => {
  const defaultData = {
    version: '0.0.20',
    latestVersion: '0.0.21',
    cwd: '/path/to/project',
    isInitialized: true,
    sqliteUnavailable: false,
    config: { theme: 'dark' },
  } as any;

  test('renders navigation tabs and processes click', () => {
    const setActiveMock = jest.fn();
    const toggleThemeMock = jest.fn();
    const shutdownMock = jest.fn();
    const toastMock = jest.fn();

    render(
      <Sidebar
        data={defaultData}
        active="config"
        setActive={setActiveMock}
        dark={true}
        toggleTheme={toggleThemeMock}
        shutdown={shutdownMock}
        toast={toastMock}
      />
    );

    // Verify logo and version
    expect(screen.getByText('Engram')).toBeInTheDocument();
    expect(screen.getByText('0.0.20')).toBeInTheDocument();
    expect(screen.getByText('/path/to/project')).toBeInTheDocument();

    // Verify upgrade notice
    expect(screen.getByText('New version available · v0.0.21')).toBeInTheDocument();

    // Click on nav item
    const runtimeTab = screen.getByText('Runtime');
    fireEvent.click(runtimeTab);
    expect(setActiveMock).toHaveBeenCalledWith('runtime');

    // Click close server
    const closeBtn = screen.getByRole('button', { name: 'Close Server' });
    fireEvent.click(closeBtn);
    expect(shutdownMock).toHaveBeenCalledTimes(1);
  });

  test('triggers copyText for version click', async () => {
    const toastMock = jest.fn();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <Sidebar
        data={defaultData}
        active="config"
        setActive={jest.fn()}
        dark={true}
        toggleTheme={jest.fn()}
        shutdown={jest.fn()}
        toast={toastMock}
      />
    );

    const versionBtn = screen.getByRole('button', { name: '0.0.20' });
    fireEvent.click(versionBtn);
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('0.0.20');
      expect(toastMock).toHaveBeenCalledWith('Copied version 0.0.20');
    });
  });
});
