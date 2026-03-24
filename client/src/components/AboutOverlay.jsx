import { useEffect, useState } from 'react';
import { marked } from 'marked';
import api from '../api';

function AboutOverlay({ onClose }) {
  const [readmeHtml, setReadmeHtml] = useState('');
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;

    const loadReadme = Promise.resolve(
      typeof api.getReadme === 'function' ? api.getReadme() : undefined
    );

    loadReadme.then((result) => {
      if (cancelled) return;
      if (result?.success && typeof result.readme === 'string') {
        const html = marked.parse(result.readme);
        setReadmeHtml(html);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    }).catch(() => {
      if (!cancelled) setStatus('error');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="about-modal-overlay"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className="about-modal"
        role="dialog"
        aria-modal="true"
        aria-label="About Color Palette Maker"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="about-modal-close"
          aria-label="Close About dialog"
          onClick={onClose}
        >
          ×
        </button>
        <h2 className="about-modal-title">About</h2>
        <div className="about-modal-content">
          {status === 'loading' && <p>Loading README...</p>}
          {status === 'error' && (
            <p>
              Unable to load README preview right now.
            </p>
          )}
          {status === 'ready' && (
            <div
              className="readme-preview markdown-body"
              dangerouslySetInnerHTML={{ __html: readmeHtml }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AboutOverlay;
