import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useClickOutsideToExit } from './useClickOutsideToExit';

function TestComponent({ enabled, onExit, viewerRef, palettePanelRef }) {
  useClickOutsideToExit(enabled, onExit, viewerRef, palettePanelRef);
  return (
    <div>
      <div ref={viewerRef} data-testid="viewer">Viewer</div>
      <div ref={palettePanelRef} data-testid="panel">Panel</div>
    </div>
  );
}

describe('useClickOutsideToExit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onExit when clicking outside viewer and panel', () => {
    const onExit = vi.fn();
    const viewerRef = { current: null };
    const panelRef = { current: null };
    const { getByTestId } = render(
      <TestComponent enabled={true} onExit={onExit} viewerRef={viewerRef} palettePanelRef={panelRef} />
    );
    viewerRef.current = getByTestId('viewer');
    panelRef.current = getByTestId('panel');
    fireEvent.mouseDown(document.body);
    expect(onExit).toHaveBeenCalled();
  });

  it('does not call onExit when clicking inside viewer', () => {
    const onExit = vi.fn();
    const viewerRef = { current: null };
    const panelRef = { current: null };
    const { getByTestId } = render(
      <TestComponent enabled={true} onExit={onExit} viewerRef={viewerRef} palettePanelRef={panelRef} />
    );
    viewerRef.current = getByTestId('viewer');
    panelRef.current = getByTestId('panel');
    fireEvent.mouseDown(getByTestId('viewer'));
    expect(onExit).not.toHaveBeenCalled();
  });

  it('does not call onExit when clicking inside palette panel', () => {
    const onExit = vi.fn();
    const viewerRef = { current: null };
    const panelRef = { current: null };
    const { getByTestId } = render(
      <TestComponent enabled={true} onExit={onExit} viewerRef={viewerRef} palettePanelRef={panelRef} />
    );
    viewerRef.current = getByTestId('viewer');
    panelRef.current = getByTestId('panel');
    fireEvent.mouseDown(getByTestId('panel'));
    expect(onExit).not.toHaveBeenCalled();
  });

  it('does not add listener when enabled is false', () => {
    const onExit = vi.fn();
    const viewerRef = { current: null };
    const { getByTestId } = render(
      <TestComponent enabled={false} onExit={onExit} viewerRef={viewerRef} palettePanelRef={{ current: null }} />
    );
    viewerRef.current = getByTestId('viewer');
    fireEvent.mouseDown(document.body);
    expect(onExit).not.toHaveBeenCalled();
  });

  it('handles undefined palettePanelRef (click outside still triggers onExit)', () => {
    const onExit = vi.fn();
    const viewerRef = { current: null };
    const { getByTestId } = render(
      <TestComponent enabled={true} onExit={onExit} viewerRef={viewerRef} palettePanelRef={undefined} />
    );
    viewerRef.current = getByTestId('viewer');
    fireEvent.mouseDown(document.body);
    expect(onExit).toHaveBeenCalled();
  });
});
