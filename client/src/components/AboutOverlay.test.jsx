import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AboutOverlay from './AboutOverlay';
import api from '../api';

vi.mock('../api', () => ({
  default: {
    getReadme: vi.fn(),
  },
}));

describe('AboutOverlay', () => {
  let onClose;
  async function renderOverlay() {
    render(<AboutOverlay onClose={onClose} />);
    await waitFor(() => expect(api.getReadme).toHaveBeenCalledTimes(1));
  }

  beforeEach(() => {
    onClose = vi.fn();
    api.getReadme.mockResolvedValue({
      success: true,
      readme: '# Test README\n\nThis is preview content.',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal dialog', async () => {
    await renderOverlay();
    expect(screen.getByRole('dialog', { name: /about color palette maker/i })).toBeInTheDocument();
  });

  it('renders parsed README content', async () => {
    await renderOverlay();
    await waitFor(() => expect(screen.getByText('Test README')).toBeInTheDocument());
    expect(screen.getByText(/This is preview content./i)).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', async () => {
    await renderOverlay();
    fireEvent.click(screen.getByRole('presentation'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed on overlay', async () => {
    await renderOverlay();
    const overlay = screen.getByRole('presentation');
    fireEvent.keyDown(overlay, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose for other keys', async () => {
    await renderOverlay();
    const overlay = screen.getByRole('presentation');
    fireEvent.keyDown(overlay, { key: 'Tab' });
    fireEvent.keyDown(overlay, { key: 'a' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when close button is clicked', async () => {
    await renderOverlay();
    fireEvent.click(screen.getByRole('button', { name: /close about dialog/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows fallback message when README load fails', async () => {
    api.getReadme.mockResolvedValueOnce({ success: false, message: 'nope' });
    await renderOverlay();
    await waitFor(() =>
      expect(screen.getByText(/Unable to load README preview right now/i)).toBeInTheDocument()
    );
  });

  it('shows fallback message when README request rejects', async () => {
    api.getReadme.mockRejectedValueOnce(new Error('network'));
    render(<AboutOverlay onClose={onClose} />);
    await waitFor(() =>
      expect(screen.getByText(/Unable to load README preview right now/i)).toBeInTheDocument()
    );
  });

  it('stops click propagation from dialog content', async () => {
    const { unmount } = render(<AboutOverlay onClose={onClose} />);
    await waitFor(() => expect(api.getReadme).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('dialog', { name: /about color palette maker/i }));
    expect(onClose).not.toHaveBeenCalled();
    unmount();
  });
});
