import { useState, useRef } from 'react';

function UploadForm({ onSubmit, message }) {
  const fileInputRef = useRef(null);
  const [uploadType, setUploadType] = useState('url');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData();
    formData.append('uploadType', uploadType);

    if (uploadType === 'url') {
      if (!imageUrl.trim()) {
        onSubmit?.({ success: false, message: 'Image URL is required.' });
        return;
      }
      formData.append('imageUrl', imageUrl.trim());
    } else {
      if (!imageFile) {
        onSubmit?.({ success: false, message: 'Please select a file.' });
        return;
      }
      formData.append('imageFile', imageFile);
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmit(formData);
      if (result?.success) {
        setImageUrl('');
        setImageFile(null);
        setUploadType('url');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="controls">
      <h2>Source</h2>
      <form id="uploadForm" onSubmit={handleSubmit}>
        <div className="input-group source-type-group">
          <div className="source-type-option">
            <input
              type="radio"
              id="uploadTypeUrl"
              name="uploadType"
              value="url"
              checked={uploadType === 'url'}
              onChange={() => setUploadType('url')}
            />
            <label htmlFor="uploadTypeUrl">Download from URL</label>
          </div>
          <div className="source-type-option">
            <input
              type="radio"
              id="uploadTypeFile"
              name="uploadType"
              value="file"
              checked={uploadType === 'file'}
              onChange={() => setUploadType('file')}
            />
            <label htmlFor="uploadTypeFile">Upload Local File</label>
          </div>
        </div>

        <div className="source-input-row">
          <div
            id="urlInputGroup"
            className={uploadType === 'url' ? '' : 'hidden'}
          >
            <input
              type="text"
              id="imageUrl"
              name="imageUrl"
              aria-label="Image URL"
              placeholder="Image URL"
              size="30"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div
            id="fileInputGroup"
            className={uploadType === 'file' ? '' : 'hidden'}
          >
            <div className="source-file-picker-row">
              <input
                ref={fileInputRef}
                type="file"
                id="imageFile"
                name="imageFile"
                className="source-file-input-native"
                aria-label="Select File"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="imageFile" className="source-file-choose-btn">
                Choose File
              </label>
              <span
                className={`source-file-name${imageFile ? '' : ' source-file-name-empty'}`}
                title={imageFile?.name || 'No file chosen — click to choose a file'}
                aria-live="polite"
                role="button"
                tabIndex={0}
                aria-label={
                  imageFile
                    ? `Selected file: ${imageFile.name}. Click to change.`
                    : 'No file chosen. Click to choose a file.'
                }
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                {imageFile?.name || 'No file chosen'}
              </span>
            </div>
          </div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Processing...' : 'Submit'}
          </button>
        </div>
        <div className="form-actions">
          <div
            id="messageArea"
            className={`messageArea ${message?.isError ? 'message-error' : 'message-success'}`}
          >
            {message?.text || ''}
          </div>
        </div>
      </form>
    </div>
  );
}

export default UploadForm;
