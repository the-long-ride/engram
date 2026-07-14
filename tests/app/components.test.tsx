import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { Badge } from '../../src/core/web/app/components/Badge.js';
import { Button } from '../../src/core/web/app/components/Button.js';
import { Card } from '../../src/core/web/app/components/Card.js';
import { ConfirmBody, ConfirmActions } from '../../src/core/web/app/components/ConfirmModal.js';
import { HelpLink } from '../../src/core/web/app/components/HelpLink.js';
import { Loading } from '../../src/core/web/app/components/Loading.js';
import { Modal } from '../../src/core/web/app/components/Modal.js';
import { ScopeChips } from '../../src/core/web/app/components/ScopeChips.js';
import { SectionHeader } from '../../src/core/web/app/components/SectionHeader.js';
import { Toast } from '../../src/core/web/app/components/Toast.js';
import { Toggle } from '../../src/core/web/app/components/Toggle.js';
import { entryDoc } from '../../src/core/web/app/utils/docs.js';

describe('Badge', () => {
  test('renders children and tone class correctly', () => {
    render(<Badge tone="pos">Positive State</Badge>);
    const element = screen.getByText('Positive State');
    expect(element).toBeInTheDocument();
    expect(element).toHaveClass('badge', 'badge-pos');
  });

  test('defaults to neutral tone', () => {
    render(<Badge>Default</Badge>);
    const element = screen.getByText('Default');
    expect(element).toHaveClass('badge-neutral');
  });
});

describe('Button', () => {
  test('renders text and supports custom properties', () => {
    const handleClick = jest.fn();
    render(
      <Button variant="solid" onClick={handleClick} disabled>
        Click Me
      </Button>
    );
    const btn = screen.getByRole('button', { name: 'Click Me' });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveClass('btn', 'btn-solid');
    expect(btn).toBeDisabled();

    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('calls onClick handler when enabled', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Active</Button>);
    const btn = screen.getByRole('button', { name: 'Active' });
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('Card', () => {
  test('renders card content with title', () => {
    render(
      <Card title="Card Title" badge={<span>My Badge</span>}>
        <p>Card Body</p>
      </Card>
    );
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('My Badge')).toBeInTheDocument();
    expect(screen.getByText('Card Body')).toBeInTheDocument();
  });

  test('renders help link when provided', () => {
    render(
      <Card title="Card Title" helpHref={entryDoc('core')}>
        <p>Card Body</p>
      </Card>
    );
    const link = screen.getByRole('link', { name: 'Open Card Title docs' });
    expect(link).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/core');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('HelpLink', () => {
  test('renders accessible external docs link', () => {
    render(<HelpLink href={entryDoc('construct')} label="Open Construct docs" />);
    const link = screen.getByRole('link', { name: 'Open Construct docs' });
    expect(link).toHaveTextContent('i');
    expect(link).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/construct');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('stops parent click handlers', () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <HelpLink href={entryDoc('core', 'include-semantic-candidates')} label="Open semantic candidate docs" />
      </div>
    );

    fireEvent.click(screen.getByRole('link', { name: 'Open semantic candidate docs' }));
    expect(parentClick).not.toHaveBeenCalled();
  });
});

describe('ConfirmModal components', () => {
  test('ConfirmBody renders message', () => {
    render(<ConfirmBody message="Are you sure?" />);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  test('ConfirmActions calls cancel and confirm buttons', () => {
    const cancelMock = jest.fn();
    const confirmMock = jest.fn();
    render(<ConfirmActions cancel={cancelMock} confirm={confirmMock} confirmText="Yes Delete" danger />);
    
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const confirmBtn = screen.getByRole('button', { name: 'Yes Delete' });
    
    expect(confirmBtn).toHaveClass('btn-danger-solid');
    
    fireEvent.click(cancelBtn);
    expect(cancelMock).toHaveBeenCalledTimes(1);
    
    fireEvent.click(confirmBtn);
    expect(confirmMock).toHaveBeenCalledTimes(1);
  });
});

describe('Loading', () => {
  test('renders spinner and text', () => {
    render(<Loading message="Processing..." />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  test('defaults to Loading...', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});

describe('ScopeChips', () => {
  test('renders active scopes', () => {
    render(
      <ScopeChips
        values={[['workspace', 'Workspace'], ['global', 'Global']]}
        active={['workspace']}
        onToggle={jest.fn()}
      />
    );
    const wsElement = screen.getByText('Workspace');
    expect(wsElement).toBeInTheDocument();
    expect(wsElement).toHaveClass('active');
  });
});

describe('SectionHeader', () => {
  test('renders section header text', () => {
    render(<SectionHeader title="Database Settings" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Database Settings' })).toBeInTheDocument();
  });

  test('renders section help link when provided', () => {
    render(<SectionHeader title="Construct" helpHref={entryDoc('construct')} />);
    expect(screen.getByRole('link', { name: 'Open Construct docs' })).toHaveAttribute('href', 'https://the-long-ride.github.io/engram/docs/entry/construct');
  });
});

describe('Toast', () => {
  test('renders toast messages', () => {
    render(<Toast toast={{ id: 1, message: 'Updated successfully', ok: true }} />);
    const toastDiv = screen.getByText('Updated successfully');
    expect(toastDiv).toBeInTheDocument();
    expect(toastDiv).toHaveClass('show', 'ok');
  });

  test('renders empty toast when null', () => {
    const { container } = render(<Toast toast={null} />);
    expect(container.firstChild).not.toHaveClass('show');
    expect(container.firstChild?.textContent).toBe('');
  });
});

describe('Toggle', () => {
  test('renders toggle button and handles click', () => {
    const toggleMock = jest.fn();
    render(<Toggle on={true} onClick={toggleMock} title="Toggle setting" />);
    const btn = screen.getByRole('button', { name: 'Toggle setting' });
    expect(btn).toHaveClass('tgl', 'on');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('title', 'Toggle setting');

    fireEvent.click(btn);
    expect(toggleMock).toHaveBeenCalledTimes(1);
  });
});

describe('Modal', () => {
  test('renders modal details and triggers copy', () => {
    const closeMock = jest.fn();
    const toastMock = jest.fn();
    const mockState = {
      title: 'Memory Detail',
      content: <p>Here is content</p>,
      copyContent: 'Content to copy',
      copyLabel: 'Copied Details',
    };

    const { rerender } = render(<Modal modal={null} close={closeMock} toast={toastMock} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<Modal modal={mockState} close={closeMock} toast={toastMock} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Memory Detail' })).toBeInTheDocument();
    expect(screen.getByText('Here is content')).toBeInTheDocument();

    // Test close via Close button (x)
    const closeBtn = screen.getByRole('button', { name: '×' });
    fireEvent.click(closeBtn);
    expect(closeMock).toHaveBeenCalledTimes(1);

    // Test escape key close behavior
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(closeMock).toHaveBeenCalledTimes(2);

    // Test backdrop mouseDown close behavior
    const backdrop = screen.getByRole('dialog').parentElement!;
    fireEvent.mouseDown(backdrop);
    // Click on dialog doesn't trigger close
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(closeMock).toHaveBeenCalledTimes(3);
  });
});
