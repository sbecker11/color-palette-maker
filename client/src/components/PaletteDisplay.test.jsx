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

  it('calls onDeleteSwatch when swatch delete button is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const deleteButtons = screen.getAllByTitle('Delete swatch');
    fireEvent.click(deleteButtons[0]);
    expect(defaultProps.onDeleteSwatch).toHaveBeenCalledWith('#ff0000');
  });

  it('calls onToggleSamplingMode when placeholder swatch is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const placeholderSwatch = screen.getByTitle(/click to sample color/i);
    fireEvent.click(placeholderSwatch);
    expect(defaultProps.onToggleSamplingMode).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSamplingMode on Enter key on placeholder swatch', () => {
    const onToggle = vi.fn();
    render(<PaletteDisplay {...defaultProps} onToggleSamplingMode={onToggle} />);
    const placeholderSwatch = screen.getByTitle(/click to sample color/i);
    fireEvent.keyDown(placeholderSwatch, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSamplingMode on Space key on placeholder swatch', () => {
    const onToggle = vi.fn();
    render(<PaletteDisplay {...defaultProps} onToggleSamplingMode={onToggle} />);
    const placeholderSwatch = screen.getByTitle(/click to sample color/i);
    fireEvent.keyDown(placeholderSwatch, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onPaletteNameChange when input changes', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/palette name/i);
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(defaultProps.onPaletteNameChange).toHaveBeenCalledWith('New Name');
  });

  it('shows no palette placeholder when no palette and not generating', () => {
    render(
      <PaletteDisplay
        {...defaultProps}
        palette={[]}
        isGenerating={false}
      />
    );
    expect(screen.getByText(/no color palette extracted/i)).toBeInTheDocument();
  });

  it('shows sampling hint when isSamplingMode and currentSampledColor', () => {
    render(
      <PaletteDisplay
        {...defaultProps}
        isSamplingMode={true}
        currentSampledColor="#abc123"
      />
    );
    expect(
      screen.getByTitle(/double-click image to add #abc123/i)
    ).toBeInTheDocument();
  });

  it('disables palette name input when no selectedMeta', () => {
    render(<PaletteDisplay {...defaultProps} selectedMeta={null} />);
    expect(screen.getByLabelText(/palette name/i)).toBeDisabled();
  });

  it('disables Regenerate button when no selectedMeta', () => {
    render(<PaletteDisplay {...defaultProps} selectedMeta={null} />);
    expect(screen.getByRole('button', { name: /regenerate/i })).toBeDisabled();
  });
});
