import { useState } from 'react';
import { formatHexDisplay, getHighContrastMono, getHighlightColor, getContrastIconSet } from '../utils';

/** Sample bizCard content matching the screenshot. bizcard-div-id is dynamic per swatch. */
function BizCardContent({ bizcardDivId, fgColor, swatchHex, highlightHex, textColor, highlightTextColor, isHovered, iconSet }) {
  return (
    <div className="biz-card-content" style={{ color: fgColor }}>
      <h4 className="biz-card-title">Senior Data Engineer</h4>
      <p className="biz-card-subtitle">(bizcard-div-{bizcardDivId})</p>
      <p className="biz-card-company">SeniorLink</p>
      <p className="biz-card-dates">2017-03 - 2019-11</p>
      <ul className="biz-card-bullets">
        <li>Built AWS-based data pipeline enabling HIPAA-compliant healthcare messaging and collaboration on the Vela platform.</li>
        <li>Orchestrated end-to-end data flow: ingesting API Gateway messages via Kinesis streams, transforming to Parquet in S3, and processing with PySpark on EMR for Redshift loading.</li>
        <li>Defined RESTful APIs for daily caregiver questionnaire submission and data retrieval through web applications.</li>
        <li>Followed privacy and encryption standards for sensitive data, including PII, PHI, PCI, Patient Data, FHIR, and HL7, as well as HIPAA and GDPR.</li>
      </ul>
      <p className="biz-card-color-line">
        <span
          className="biz-card-color-swatch-part"
          style={{
            padding: '2px 4px',
            ...(!isHovered ? { border: `1px solid ${textColor}` } : { border: '1px solid transparent' }),
          }}
        >
          Swatch: {swatchHex}
        </span>
        {' | '}
        <span
          className="biz-card-color-highlight-part"
          style={{
            padding: '2px 4px',
            ...(isHovered ? { border: `1px solid ${highlightTextColor}` } : { border: '1px solid transparent' }),
          }}
        >
          Highlight: {highlightHex}
        </span>
      </p>
      {iconSet && (
        <p className="palette-icon-row biz-card-icon-row" data-variant={iconSet.variant} aria-hidden="true">
          <img src={iconSet.url} alt="" width={16} height={16} className="palette-icon biz-card-icon" />
          <img src={iconSet.back} alt="" width={16} height={16} className="palette-icon biz-card-icon" />
          <img src={iconSet.img} alt="" width={16} height={16} className="palette-icon biz-card-icon" />
        </p>
      )}
    </div>
  );
}

export default function BizCardModal({ hexColor, swatchIndex, onClose }) {
  const [isHovered, setIsHovered] = useState(false);
  const color = hexColor ?? '#f5d000';
  const textColor = getHighContrastMono(color);
  const highlightColor = getHighlightColor(color);
  const highlightTextColor = getHighContrastMono(highlightColor);
  const bgColor = isHovered ? highlightColor : color;
  const fgColor = isHovered ? highlightTextColor : textColor;
  const iconSet = getContrastIconSet(bgColor);

  return (
    <div
      className="biz-card-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Swatch biz card"
    >
      <div
        className="biz-card"
        style={{ backgroundColor: bgColor }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="biz-card-close-btn"
          title="Close"
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ×
        </button>
        <BizCardContent
          bizcardDivId={swatchIndex ?? 7}
          fgColor={fgColor}
          swatchHex={formatHexDisplay(color)}
          highlightHex={formatHexDisplay(highlightColor)}
          textColor={textColor}
          highlightTextColor={highlightTextColor}
          isHovered={isHovered}
          iconSet={iconSet}
        />
        <button
          type="button"
          className="biz-card-forward-btn"
          title="Forward"
          aria-label="Forward"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          ›
        </button>
      </div>
    </div>
  );
}
