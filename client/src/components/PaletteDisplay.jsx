import MetadataDisplay from './MetadataDisplay';

function PaletteDisplay({
  palette,
  isGenerating,
  isSamplingMode,
  currentSampledColor,
  onToggleSamplingMode,
  onDeleteSwatch,
  paletteName,
  onPaletteNameChange,
  onExport,
  onRegenerate,
  onDuplicate,
  onPaletteNameBlur,
  selectedMeta,
}) {
  const hasPalette = palette && Array.isArray(palette) && palette.length > 0;
  const showPlaceholder = !isGenerating && !hasPalette;

  return (
    <div id="middlePanel">
      <h2>Color Palettes</h2>
      <div id="paletteDisplay">
        {isGenerating && (
          <span className="placeholder">Generating palette...</span>
        )}
        {!isGenerating && hasPalette && palette.map((hexColor) => (
          <div key={hexColor} className="palette-item">
            <div
              className="palette-color"
              style={{ backgroundColor: hexColor }}
              title={hexColor}
            />
            <span className="palette-label">{hexColor}</span>
            <button
              type="button"
              className="swatch-delete-btn"
              title="Delete swatch"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteSwatch?.(hexColor);
              }}
            >
              ×
            </button>
          </div>
        ))}
        {!isGenerating && showPlaceholder && (
          <span className="placeholder">
            No color palette extracted for this image.
          </span>
        )}
        {/* Sampling placeholder swatch */}
        <div
          className="palette-item"
          title={
            isSamplingMode && currentSampledColor
              ? `Double-click image to add ${currentSampledColor}. Click swatch to cancel.`
              : isSamplingMode
                ? 'Double-click image to pick color. Click swatch to cancel sampling.'
                : 'Click to sample color from image'
          }
          onClick={onToggleSamplingMode}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleSamplingMode?.();
            }
          }}
        >
          <div
            className={`palette-color test-placeholder-swatch ${isSamplingMode ? 'sampling' : ''}`}
            style={{
              backgroundColor: isSamplingMode && currentSampledColor ? currentSampledColor : 'transparent',
            }}
          />
          <span className="palette-label test-placeholder-label">#888888</span>
        </div>
      </div>
      <div id="paletteNameContainer">
        <label htmlFor="paletteNameInput">Palette Name:</label>
        <input
          type="text"
          id="paletteNameInput"
          name="paletteNameInput"
          value={paletteName}
          onChange={(e) => onPaletteNameChange?.(e.target.value)}
          onBlur={() => onPaletteNameBlur?.()}
          disabled={!selectedMeta}
        />
        <button type="button" id="regeneratePaletteButton" onClick={onRegenerate} disabled={!selectedMeta || isGenerating} title="Replace palette with K-means clustering">
          Regenerate (K-means)
        </button>
        <button type="button" id="duplicatePaletteButton" onClick={onDuplicate} disabled={!selectedMeta} title="Duplicate palette to a new entry at top of list">
          Duplicate
        </button>
        <button type="button" id="exportPaletteButton" onClick={onExport}>
          Export
        </button>
      </div>
      <MetadataDisplay meta={selectedMeta} />
    </div>
  );
}

export default PaletteDisplay;
