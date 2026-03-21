import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaletteDisplay from './PaletteDisplay';

describe('PaletteDisplay', () => {
  const defaultProps = {
    palette: ['#ff0000', '#00ff00'],
    isGenerating: false,
    isSamplingMode: false,
    currentSampledColor: null,
    onToggleSamplingMode: vi.fn(),
    onAddingSwatchesModeChange: vi.fn(),
    onDeleteSwatch: vi.fn(),
    onClearAllSwatches: vi.fn(),
    paletteName: 'Test Palette',
    onPaletteNameChange: vi.fn(),
    onExport: vi.fn(),
    onRegenerateWithK: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onPaletteNameBlur: vi.fn(),
    backgroundSwatchIndex: undefined,
    onBackgroundSwatchIndexChange: vi.fn(),
    selectedMeta: { paletteName: 'Test Palette' },
    onDetectRegions: vi.fn(),
    onDeleteRegions: vi.fn(),
    onEnterDeleteRegionMode: vi.fn(),
    isDeleteRegionMode: false,
    onDeleteRegionModeChange: vi.fn(),
    regionsDetecting: false,
    hasRegions: false,
    onSwatchHover: vi.fn(),
  };

  it('renders Color Palette heading', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Color Palette');
  });

  it('renders palette swatches', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.getByTitle(/^#ff0000/)).toBeInTheDocument();
    expect(screen.getByTitle(/^#00ff00/)).toBeInTheDocument();
  });

  it('shows actions dropdown with K-means options', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /find k-means swatches \(5\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /find k-means swatches \(7\)/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /find k-means swatches \(9\)/i })).toBeInTheDocument();
  });

  it('calls onRegenerateWithK when K-means (7) is selected', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'kmeans7' } });
    expect(defaultProps.onRegenerateWithK).toHaveBeenCalledWith(7);
  });

  it('shows Rename Palette, (Dup)licate Palette, (Del)ete Palette in actions dropdown', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.getByRole('option', { name: 'Rename Palette' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '(Dup)licate Palette' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '(Del)ete Palette' })).toBeInTheDocument();
  });

  it('calls onDelete when (Del)ete is selected from dropdown', async () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'delete' } });
    await waitFor(() => expect(defaultProps.onDelete).toHaveBeenCalledTimes(1));
  });

  it('calls onDuplicate when (Dup)licate is selected from dropdown', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'duplicate' } });
    expect(defaultProps.onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('calls onAddingSwatchesModeChange when Adding swatches (click) checkbox is changed', () => {
    const onAddingSwatchesModeChange = vi.fn();
    render(<PaletteDisplay {...defaultProps} onAddingSwatchesModeChange={onAddingSwatchesModeChange} />);
    const toggle = screen.getByRole('checkbox', { name: 'Adding swatches (click)' });
    fireEvent.click(toggle);
    expect(onAddingSwatchesModeChange).toHaveBeenCalledWith(true);
  });

  it('Adding swatches (click) toggle is checked when isSamplingMode', () => {
    render(<PaletteDisplay {...defaultProps} isSamplingMode={true} />);
    expect(screen.getByRole('checkbox', { name: 'Adding swatches (click)' })).toBeChecked();
  });

  it('Adding swatches (click) toggle is disabled when no selectedMeta', () => {
    render(<PaletteDisplay {...defaultProps} selectedMeta={null} />);
    expect(screen.getByRole('checkbox', { name: 'Adding swatches (click)' })).toBeDisabled();
  });

  it('calls onDeleteRegionModeChange when Deleting regions (click) checkbox is changed', () => {
    const onDeleteRegionModeChange = vi.fn();
    render(<PaletteDisplay {...defaultProps} hasRegions={true} onDeleteRegionModeChange={onDeleteRegionModeChange} />);
    const toggle = screen.getByRole('checkbox', { name: 'Deleting regions (click)' });
    fireEvent.click(toggle);
    expect(onDeleteRegionModeChange).toHaveBeenCalledWith(true);
  });

  it('Deleting regions (click) checkbox is checked when isDeleteRegionMode', () => {
    render(<PaletteDisplay {...defaultProps} hasRegions={true} isDeleteRegionMode={true} />);
    expect(screen.getByRole('checkbox', { name: 'Deleting regions (click)' })).toBeChecked();
  });

  it('Deleting regions (click) checkbox is disabled when no regions', () => {
    render(<PaletteDisplay {...defaultProps} hasRegions={false} />);
    expect(screen.getByRole('checkbox', { name: 'Deleting regions (click)' })).toBeDisabled();
  });

  it('shows Export Palette option in actions dropdown', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.getByRole('option', { name: /export palette/i })).toBeInTheDocument();
  });

  it('calls onExport when Export is selected from dropdown', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'export' } });
    expect(defaultProps.onExport).toHaveBeenCalledTimes(1);
  });

  it('shows palette name input', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/name/i);
    expect(input).toHaveValue('Test Palette');
  });

  it('calls onPaletteNameBlur when palette name input loses focus', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/name/i);
    fireEvent.blur(input);
    expect(defaultProps.onPaletteNameBlur).toHaveBeenCalledTimes(1);
  });

  it('calls onPaletteNameBlur when Enter is pressed in palette name input', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/name/i);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onPaletteNameBlur).toHaveBeenCalled();
  });

  it('shows Generating placeholder when isGenerating', () => {
    render(<PaletteDisplay {...defaultProps} isGenerating={true} />);
    expect(screen.getByText(/generating palette/i)).toBeInTheDocument();
  });

  it('calls onDeleteSwatch when swatch delete button is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const deleteButtons = screen.getAllByTitle('Delete palette swatch');
    fireEvent.click(deleteButtons[0]);
    expect(defaultProps.onDeleteSwatch).toHaveBeenCalledWith('#ff0000');
  });

  it('calls onToggleSamplingMode when placeholder swatch is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const placeholderSwatch = screen.getByTitle(/click to enter add swatch mode/i);
    fireEvent.click(placeholderSwatch);
    expect(defaultProps.onToggleSamplingMode).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSamplingMode on Enter key on placeholder swatch', () => {
    const onToggle = vi.fn();
    render(<PaletteDisplay {...defaultProps} onToggleSamplingMode={onToggle} />);
    const placeholderSwatch = screen.getByTitle(/click to enter add swatch mode/i);
    fireEvent.keyDown(placeholderSwatch, { key: 'Enter' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleSamplingMode on Space key on placeholder swatch', () => {
    const onToggle = vi.fn();
    render(<PaletteDisplay {...defaultProps} onToggleSamplingMode={onToggle} />);
    const placeholderSwatch = screen.getByTitle(/click to enter add swatch mode/i);
    fireEvent.keyDown(placeholderSwatch, { key: ' ' });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onPaletteNameChange when input changes', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/name/i);
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(defaultProps.onPaletteNameChange).toHaveBeenCalledWith('New Name');
  });

  it('shows bg button when palette has colors and enters select mode when clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const bgBtn = screen.getByRole('button', { name: 'bg' });
    expect(bgBtn).toBeInTheDocument();
    fireEvent.click(bgBtn);
    expect(screen.getByText(/select bg swatch or/i)).toBeInTheDocument();
    expect(bgBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onBackgroundSwatchIndexChange when in bg mode and user clicks a swatch', () => {
    const onBackground = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        backgroundSwatchIndex={undefined}
        onBackgroundSwatchIndexChange={onBackground}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'bg' }));
    const setBgSwatches = screen.getAllByTitle(/set as background swatch/i);
    fireEvent.click(setBgSwatches[1]);
    expect(onBackground).toHaveBeenCalledWith(1);
  });

  it('displays background swatch (grey border on .palette-item-background)', () => {
    render(
      <PaletteDisplay
        {...defaultProps}
        backgroundSwatchIndex={1}
      />
    );
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('#00ff00')).toBeInTheDocument();
    const items = document.querySelectorAll('.palette-item.palette-item-background');
    expect(items).toHaveLength(1);
  });

  it('defaults to first swatch (index 0) as background when backgroundSwatchIndex is undefined', () => {
    render(
      <PaletteDisplay
        {...defaultProps}
        backgroundSwatchIndex={undefined}
      />
    );
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('#ff0000')).toBeInTheDocument();
    const items = document.querySelectorAll('.palette-item.palette-item-background');
    expect(items).toHaveLength(1);
  });

  it('when in bg mode, none button clears background and exits mode', () => {
    const onBackground = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        backgroundSwatchIndex={0}
        onBackgroundSwatchIndexChange={onBackground}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'bg' }));
    fireEvent.click(screen.getByRole('button', { name: 'none' }));
    expect(onBackground).toHaveBeenCalledWith(null);
    expect(screen.queryByText(/select bg swatch or/i)).not.toBeInTheDocument();
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
      screen.getByTitle(/click palette image to add #abc123/i)
    ).toBeInTheDocument();
  });

  it('disables palette name input when no selectedMeta', () => {
    render(<PaletteDisplay {...defaultProps} selectedMeta={null} />);
    expect(screen.getByLabelText(/name/i)).toBeDisabled();
  });

  it('disables actions dropdown when no selectedMeta', () => {
    render(<PaletteDisplay {...defaultProps} selectedMeta={null} />);
    expect(screen.getByRole('combobox', { name: 'Choose action' })).toBeDisabled();
  });

  it('shows Region Detection dropdown when Detect All Regions is selected', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.queryByLabelText('Region detection approach')).not.toBeInTheDocument();
    const actionSelect = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(actionSelect, { target: { value: 'detectRegions' } });
    expect(screen.getByLabelText('Region detection approach')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detect regions' })).toBeInTheDocument();
  });

  it('calls onDetectRegions with selected strategy when Detect button clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose action' }), { target: { value: 'detectRegions' } });
    const detectBtn = screen.getByRole('button', { name: 'Detect regions' });
    fireEvent.click(detectBtn);
    expect(defaultProps.onDetectRegions).toHaveBeenCalledTimes(1);
    expect(defaultProps.onDetectRegions).toHaveBeenCalledWith('default', {});
  });

  it('calls onDeleteRegions when Clear all Regions is selected', () => {
    render(<PaletteDisplay {...defaultProps} hasRegions={true} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'deleteRegions' } });
    expect(defaultProps.onDeleteRegions).toHaveBeenCalledTimes(1);
  });

  it('calls onEnterDeleteRegionMode when Deleting Regions (click) is selected', () => {
    render(<PaletteDisplay {...defaultProps} hasRegions={true} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'enterDeleteRegionMode' } });
    expect(defaultProps.onEnterDeleteRegionMode).toHaveBeenCalledTimes(1);
  });

  it('calls onRegenerateWithK(5) when Find K-Means Swatches (5) is selected', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'kmeans5' } });
    expect(defaultProps.onRegenerateWithK).toHaveBeenCalledWith(5);
  });

  it('calls onRegenerateWithK(9) when Find K-Means Swatches (9) is selected', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'kmeans9' } });
    expect(defaultProps.onRegenerateWithK).toHaveBeenCalledWith(9);
  });

  it('adds highlighted class to swatch when hovered', () => {
    render(<PaletteDisplay {...defaultProps} hoveredSwatchIndex={0} />);
    const swatch = document.querySelector('.palette-swatch.highlighted');
    expect(swatch).toBeInTheDocument();
  });

  it('focuses and selects palette name input when Rename Palette is selected', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const input = screen.getByLabelText(/name/i);
    input.focus = vi.fn();
    input.select = vi.fn();
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'rename' } });
    expect(input.focus).toHaveBeenCalled();
    expect(input.select).toHaveBeenCalled();
  });

  it('calls onToggleSamplingMode when Adding Swatches (click) is selected (same as empty swatch)', () => {
    defaultProps.onToggleSamplingMode.mockClear();
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'enterAddingSwatches' } });
    expect(defaultProps.onToggleSamplingMode).toHaveBeenCalledTimes(1);
  });

  it('calls onClearAllSwatches when Clear all Swatches is selected', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'clearSwatches' } });
    expect(defaultProps.onClearAllSwatches).toHaveBeenCalledTimes(1);
  });

  it('calls onSwatchHover on mouse enter and leave', () => {
    const onSwatchHover = vi.fn();
    render(<PaletteDisplay {...defaultProps} onSwatchHover={onSwatchHover} />);
    const swatches = document.querySelectorAll('.palette-swatch');
    fireEvent.mouseEnter(swatches[0]);
    expect(onSwatchHover).toHaveBeenCalledWith(0);
    fireEvent.mouseLeave(swatches[0]);
    expect(onSwatchHover).toHaveBeenCalledWith(null);
  });

  it('shows region detection section when selectedMeta has regions', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    render(<PaletteDisplay {...defaultProps} selectedMeta={metaWithRegions} />);
    expect(screen.getByLabelText('Region detection approach')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detect regions' })).toBeInTheDocument();
  });

  it('calls onRegionStrategyChange when region strategy dropdown changes', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onRegionStrategyChange = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onRegionStrategyChange={onRegionStrategyChange}
      />
    );
    const strategySelect = screen.getByLabelText('Region detection approach');
    fireEvent.change(strategySelect, { target: { value: 'adaptive' } });
    expect(onRegionStrategyChange).toHaveBeenCalledWith('adaptive');
  });

  it('calls onDetectRegions with strategy and params when strategy has params', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    const strategySelect = screen.getByLabelText('Region detection approach');
    fireEvent.change(strategySelect, { target: { value: 'adaptive' } });
    const detectBtn = screen.getByRole('button', { name: 'Detect regions' });
    fireEvent.click(detectBtn);
    expect(onDetectRegions).toHaveBeenCalledWith(
      'adaptive',
      expect.objectContaining({ adaptiveBlockSize: expect.any(Number), adaptiveC: expect.any(Number) })
    );
  });

  it('shows Detect button as "Click" when templateDrawPhase is click and strategy is template_match', () => {
    render(
      <PaletteDisplay
        {...defaultProps}
        templateDrawPhase="click"
      />
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose action' }), { target: { value: 'detectRegions' } });
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'template_match' } });
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });

  it('shows Detect button as "Drag" when templateDrawPhase is drag and strategy is template_match', () => {
    render(
      <PaletteDisplay
        {...defaultProps}
        templateDrawPhase="drag"
      />
    );
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose action' }), { target: { value: 'detectRegions' } });
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'template_match' } });
    expect(screen.getByRole('button', { name: 'Drag' })).toBeInTheDocument();
  });

  it('opens BizCardModal when swatch is clicked and closes on close', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.queryByRole('dialog', { name: 'Swatch biz card' })).not.toBeInTheDocument();
    const swatch = document.querySelector('.palette-swatch-filled');
    fireEvent.click(swatch);
    expect(screen.getByRole('dialog', { name: 'Swatch biz card' })).toBeInTheDocument();
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog', { name: 'Swatch biz card' })).not.toBeInTheDocument();
  });

  it('opens BizCardModal when swatch "i" button is clicked', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const detailBtns = screen.getAllByTitle('View swatch biz card');
    fireEvent.click(detailBtns[0]);
    expect(screen.getByRole('dialog', { name: 'Swatch biz card' })).toBeInTheDocument();
  });

  it('opens BizCardModal when Enter key on swatch', () => {
    render(<PaletteDisplay {...defaultProps} />);
    const swatch = document.querySelector('.palette-swatch-filled');
    fireEvent.keyDown(swatch, { key: 'Enter' });
    expect(screen.getByRole('dialog', { name: 'Swatch biz card' })).toBeInTheDocument();
  });

  it('calls onShowRegionBoundariesChange when Show region boundaries is toggled', () => {
    const onShowRegionBoundariesChange = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        hasRegions={true}
        showRegionBoundaries={true}
        onShowRegionBoundariesChange={onShowRegionBoundariesChange}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Show region boundaries' });
    fireEvent.click(checkbox);
    expect(onShowRegionBoundariesChange).toHaveBeenCalledWith(false);
  });

  it('calls onShowMatchPaletteSwatchesChange when Match Region Swatches is toggled', () => {
    const onShowMatchPaletteSwatchesChange = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        hasRegions={true}
        hasPalette={true}
        showMatchPaletteSwatches={false}
        onShowMatchPaletteSwatchesChange={onShowMatchPaletteSwatchesChange}
      />
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Match Region Swatches' });
    fireEvent.click(checkbox);
    expect(onShowMatchPaletteSwatchesChange).toHaveBeenCalledWith(true);
  });

  it('shows (by regions) in K-means options when hasRegions', () => {
    render(<PaletteDisplay {...defaultProps} hasRegions={true} />);
    expect(screen.getByRole('option', { name: /find k-means swatches \(5\) \(by regions\)/i })).toBeInTheDocument();
  });

  it('renders region count message when selectedMeta and not detecting', () => {
    render(<PaletteDisplay {...defaultProps} regionCount={3} />);
    expect(screen.getByText(/# regions detected:\s*3/)).toBeInTheDocument();
  });

  it('renders MetadataDisplay with selectedMeta', () => {
    render(<PaletteDisplay {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Palette Info' })).toBeInTheDocument();
  });

  it('initializes region strategy from selectedMeta.regionStrategy', () => {
    const metaWithStrategy = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
      regionStrategy: 'canny',
      regionParams: { cannyLow: 30, cannyHigh: 100 },
    };
    render(<PaletteDisplay {...defaultProps} selectedMeta={metaWithStrategy} />);
    const strategySelect = screen.getByLabelText('Region detection approach');
    expect(strategySelect).toHaveValue('canny');
    expect(screen.getByLabelText('Low:')).toBeInTheDocument();
    expect(screen.getByLabelText('High:')).toBeInTheDocument();
  });

  it('calls onDetectRegions with canny params when strategy is canny', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'canny' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'canny',
      expect.objectContaining({ cannyLow: expect.any(Number), cannyHigh: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with watershed params when strategy is watershed', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'watershed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'watershed',
      expect.objectContaining({ watershedDistRatio: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with grabcut params when strategy is grabcut', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'grabcut' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'grabcut',
      expect.objectContaining({ grabcutRectPad: expect.any(Number), grabcutIterCount: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with slic params when strategy is slic', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'slic' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'slic',
      expect.objectContaining({ slicRegionSize: expect.any(Number), slicRuler: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with adaptive params when strategy is adaptive', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'adaptive' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'adaptive',
      expect.objectContaining({ adaptiveBlockSize: expect.any(Number), adaptiveC: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with meanshift params when strategy is meanshift', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'meanshift' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'meanshift',
      expect.objectContaining({ meanshiftSpatial: expect.any(Number), meanshiftColor: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with quadtree params when strategy is quadtree', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'quadtree' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'quadtree',
      expect.objectContaining({ quadtreeVariance: expect.any(Number), quadtreeMinSize: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with rectangles params when strategy is rectangles', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'rectangles' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'rectangles',
      expect.objectContaining({ rectanglesEpsilonRatio: expect.any(Number) })
    );
  });

  it('calls onDetectRegions with template_match strategy (no extra params)', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'template_match' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith('template_match', {});
  });

  it('calls onDetectRegions with circles params when strategy is circles', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'circles' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'circles',
      expect.objectContaining({
        circlesMinRadiusRatio: expect.any(Number),
        circlesMaxRadiusRatio: expect.any(Number),
        circlesParam1: expect.any(Number),
        circlesParam2: expect.any(Number),
        circlesMinDistRatio: expect.any(Number),
      })
    );
  });

  it('calls onDetectRegions with contour_circles params when strategy is contour_circles', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    const onDetectRegions = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        onDetectRegions={onDetectRegions}
      />
    );
    fireEvent.change(screen.getByLabelText('Region detection approach'), { target: { value: 'contour_circles' } });
    fireEvent.click(screen.getByRole('button', { name: 'Detect regions' }));
    expect(onDetectRegions).toHaveBeenCalledWith(
      'contour_circles',
      expect.objectContaining({
        circlesMinRadiusRatio: expect.any(Number),
        circlesMaxRadiusRatio: expect.any(Number),
        contourCirclesCircularity: expect.any(Number),
      })
    );
  });

  it('when in bg mode and clicking same swatch sets background to null', () => {
    const onBackground = vi.fn();
    render(
      <PaletteDisplay
        {...defaultProps}
        backgroundSwatchIndex={0}
        onBackgroundSwatchIndexChange={onBackground}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'bg' }));
    const setBgSwatches = screen.getAllByTitle(/set as background swatch/i);
    fireEvent.click(setBgSwatches[0]);
    expect(onBackground).toHaveBeenCalledWith(null);
  });

  it('region detection select and Detect button are disabled when regionsDetecting', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
    };
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        regionsDetecting={true}
      />
    );
    expect(screen.getByLabelText('Region detection approach')).toBeDisabled();
    const detectBtn = screen.getByRole('button', { name: 'Detect regions' });
    expect(detectBtn).toBeDisabled();
  });

  it('handles localStorage.getItem throwing (e.g. private mode)', () => {
    const orig = Storage.prototype.getItem;
    Storage.prototype.getItem = () => { throw new Error('SecurityError'); };
    const metaWithRegions = { ...defaultProps.selectedMeta, regions: [[[0, 0], [1, 0], [1, 1], [0, 1]]] };
    render(<PaletteDisplay {...defaultProps} selectedMeta={metaWithRegions} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Color Palette');
    Storage.prototype.getItem = orig;
  });

  it('handles localStorage.setItem throwing when Detect All Regions selected', async () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('QuotaExceeded'); };
    const metaWithRegions = { ...defaultProps.selectedMeta, regions: [[[0, 0], [1, 0], [1, 1], [0, 1]]] };
    render(<PaletteDisplay {...defaultProps} selectedMeta={metaWithRegions} />);
    const select = screen.getByRole('combobox', { name: 'Choose action' });
    fireEvent.change(select, { target: { value: 'detectRegions' } });
    await waitFor(() => expect(screen.getByLabelText('Region detection approach')).toBeInTheDocument());
    Storage.prototype.setItem = orig;
  });

  it('shows Drag/Click button labels when template_match and templateDrawPhase set', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
      regionStrategy: 'template_match',
    };
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        templateDrawPhase="drag"
      />
    );
    expect(screen.getByRole('button', { name: 'Drag' })).toBeInTheDocument();
  });

  it('shows Click button when templateDrawPhase is click', () => {
    const metaWithRegions = {
      ...defaultProps.selectedMeta,
      regions: [[[0, 0], [10, 0], [10, 10], [0, 10]]],
      regionStrategy: 'template_match',
    };
    render(
      <PaletteDisplay
        {...defaultProps}
        selectedMeta={metaWithRegions}
        templateDrawPhase="click"
      />
    );
    expect(screen.getByRole('button', { name: 'Click' })).toBeInTheDocument();
  });
});
