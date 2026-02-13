import { getFilenameFromMeta, getFilenameWithoutExt } from '../utils';

function ImageLibrary({
  images,
  selectedMeta,
  onSelectImage,
  onDeleteImage,
  isLoading,
}) {
  if (isLoading) {
    return (
      <div id="storedImagesSection">
        <h2>Library</h2>
        <ul id="fileList">
          <li>Loading...</li>
        </ul>
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div id="storedImagesSection">
        <h2>Library</h2>
        <ul id="fileList">
          <li>No images stored.</li>
        </ul>
      </div>
    );
  }

  return (
    <div id="storedImagesSection">
      <h2>Library</h2>
      <ul id="fileList">
        {images.map((meta) => {
          const filename = getFilenameFromMeta(meta) || 'unknown';
          const imageUrl = '/uploads/' + encodeURIComponent(filename);
          const filenameWithoutExt = getFilenameWithoutExt(filename);
          const displayName =
            meta.paletteName && meta.paletteName !== filenameWithoutExt
              ? meta.paletteName
              : filename;
          const dimensions =
            meta.width && meta.height ? ` (${meta.width}x${meta.height}) ` : ' ';
          const tooltip = `Filename: ${filename} | Format: ${meta.format || '?'}, Size: ${meta.fileSizeBytes ? Math.round(meta.fileSizeBytes / 1024) + ' KB' : '?'}, Added: ${meta.createdDateTime ? new Date(meta.createdDateTime).toLocaleString() : '?'}`;
          const isSelected = selectedMeta && getFilenameFromMeta(selectedMeta) === filename;

          return (
            <li
              key={filename}
              className={isSelected ? 'selected-image' : ''}
              data-metadata={JSON.stringify(meta)}
            >
              <a
                href={imageUrl}
                title={tooltip}
                onClick={(e) => {
                  e.preventDefault();
                  onSelectImage?.(meta, imageUrl);
                }}
              >
                {displayName}
                {dimensions}
              </a>
              <button
                type="button"
                style={{ marginLeft: '5px', fontSize: '0.8em', padding: '2px 5px' }}
                onClick={() => onDeleteImage?.(filename, meta)}
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ImageLibrary;
