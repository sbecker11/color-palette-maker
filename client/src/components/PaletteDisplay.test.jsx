import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PaletteDisplay from './PaletteDisplay';

describe('PaletteDisplay', () => {
  const defaultProps = {
    palette: ['#ff0000', '#00ff00'],
    isGenerating: false,
    isSamplingMode: false,
    currentSampledColor: null,
    onToggleSamplingMode: vi.fn(),
    onDeleteSwatch: vi.fn(),
    paletteName: 'Test Palette',
    onPaletteNameChange: vi.fn(),
    onExport: vi.fn(),
    onRegenerate: vi.fn(),
    onDuplicate: vi.fn(),
    onPaletteNameBlur: vi.fn(),
    selectedMeta: { paletteName: 'Test Palette' },
  };

  it('renders Color Palette heading', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Color Palette');
  });

  it('renders palette swatches', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.getByTitle('#ff0000')).toBeInTheDocument();
    expect(screen.getByTitle('#00ff00')).toBeInTheDocument();
  });

  it('shows Regenerate (K-means) button', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /regenerate/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls onRegenerate when Regenerate button is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    expect(defaultProps.onRegenerate).toHaveBeenCalledTimes(1);
  });

  it('shows Duplicate button', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /duplicate/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls onDuplicate when Duplicate button is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));
    expect(defaultProps.onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('shows Export button', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const btn = screen.getByRole('button', { name: /export/i });
    expect(btn).toBeInTheDocument();
  });

  it('calls onExport when Export button is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
  });

  it('shows palette name input', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/palette name/i);
    expect(input).toHaveValue('Test Palette');
  });

  it('calls onPaletteNameBlur when palette name input loses focus', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/palette name/i);
    fireEvent.blur(input);
    expect(defaultProps.onPaletteNameBlur).toHaveBeenCalledTimes(1);
  });

  it('shows Generating placeholder when isGenerating', () => {
    render(<PaletteDisplay {...defaultProps} isGenerating={true} />);
    expect(screen.getByText(/generating palette/i)).toBeInTheDocument();
  });
});
