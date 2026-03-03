import { formatHexDisplay, getHighContrastMono, getHighlightColor } from '../utils';

/**
 * A "biz card" preview of a palette swatch in normal or highlighted mode.
 * Uses computed textColor/highlightTextColor for contrast and highlightColor when highlighted.
 */
export default function SwatchCard({ hexColor, label, isHighlighted = false }) {
  const color = hexColor ?? '#808080';
  const textColor = getHighContrastMono(color);
  const highlightColor = getHighlightColor(color);
  const highlightTextColor = getHighContrastMono(highlightColor);

  const bgColor = isHighlighted ? highlightColor : color;
  const fgColor = isHighlighted ? highlightTextColor : textColor;

  return (
    <div
      className={`biz-card-swatch ${isHighlighted ? 'biz-card-swatch-highlighted' : ''}`}
      style={{
        backgroundColor: bgColor,
        color: fgColor,
      }}
      title={formatHexDisplay(color)}
      role="presentation"
    >
      <span className="biz-card-swatch-label" aria-hidden="true">{label}</span>
      <span className="biz-card-swatch-hex" aria-hidden="true">{formatHexDisplay(color)}</span>
    </div>
  );
}
