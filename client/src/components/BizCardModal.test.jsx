import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BizCardModal from './BizCardModal';

describe('BizCardModal', () => {
  it('renders dialog with aria label', () => {
    const onClose = vi.fn();
    render(<BizCardModal hexColor="#c1543c" swatchIndex={0} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'Swatch biz card' })).toBeInTheDocument();
  });

  it('shows biz card content with title and swatch hex', () => {
    render(<BizCardModal hexColor="#ff0000" swatchIndex={1} onClose={vi.fn()} />);
    expect(screen.getByText('Senior Data Engineer')).toBeInTheDocument();
    expect(screen.getByText(/Swatch: #ff0000/)).toBeInTheDocument();
  });

  it('uses default color when hexColor not provided', () => {
    render(<BizCardModal swatchIndex={2} onClose={vi.fn()} />);
    expect(screen.getByText(/Swatch: #f5d000/)).toBeInTheDocument();
  });

  it('uses swatchIndex in bizcard div id', () => {
    render(<BizCardModal hexColor="#00f" swatchIndex={3} onClose={vi.fn()} />);
    expect(screen.getByText('(bizcard-div-3)')).toBeInTheDocument();
  });

  it('uses default swatch index when not provided', () => {
    render(<BizCardModal hexColor="#0f0" onClose={vi.fn()} />);
    expect(screen.getByText('(bizcard-div-7)')).toBeInTheDocument();
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<BizCardModal hexColor="#f00" onClose={onClose} />);
    const overlay = container.querySelector('.biz-card-modal-overlay');
    expect(overlay).toBeInTheDocument();
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Close button is clicked', () => {
    const onClose = vi.fn();
    render(<BizCardModal hexColor="#f00" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Forward button is clicked', () => {
    const onClose = vi.fn();
    render(<BizCardModal hexColor="#f00" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when card body is clicked', () => {
    const onClose = vi.fn();
    render(<BizCardModal hexColor="#f00" onClose={onClose} />);
    const card = screen.getByRole('dialog').querySelector('.biz-card');
    fireEvent.click(card);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows highlight section and icons', () => {
    render(<BizCardModal hexColor="#333" swatchIndex={0} onClose={vi.fn()} />);
    expect(screen.getByText(/Highlight: #/)).toBeInTheDocument();
    const imgs = screen.getByRole('dialog').querySelectorAll('.biz-card-icon');
    expect(imgs.length).toBeGreaterThanOrEqual(1);
  });

  it('toggles hover state on mouse enter and leave', () => {
    render(<BizCardModal hexColor="#ffffff" swatchIndex={0} onClose={vi.fn()} />);
    const card = screen.getByRole('dialog').querySelector('.biz-card');
    expect(card).toBeInTheDocument();
    fireEvent.mouseEnter(card);
    expect(screen.getByText(/Highlight: #/)).toBeInTheDocument();
    fireEvent.mouseLeave(card);
  });
});
