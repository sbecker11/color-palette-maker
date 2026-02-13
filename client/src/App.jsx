import { useState, useEffect, useCallback } from 'react';
import api from './api';
import {
  getFilenameFromMeta,
  getFilenameWithoutExt,
} from './utils';
import Header from './components/Header';
import UploadForm from './components/UploadForm';
import ImageLibrary from './components/ImageLibrary';
import PaletteDisplay from './components/PaletteDisplay';
import ImageViewer from './components/ImageViewer';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [images, setImages] = useState([]);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [paletteGenerating, setPaletteGenerating] = useState(false);
  const [message, setMessage] = useState({ text: '', isError: false });
  const [paletteName, setPaletteName] = useState('');
  const [isSamplingMode, setIsSamplingMode] = useState(false);
  const [currentSampledColor, setCurrentSampledColor] = useState(null);

  // Apply theme to document
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const showMessage = useCallback((text, isError = false) => {
    setMessage({ text, isError });
    if (text) {
      setTimeout(() => setMessage({ text: '', isError: false }), 5000);
    }
  }, []);

  const loadImages = useCallback(async (opts = {}) => {
    const { selectFirst = true } = opts;
    setIsLoading(true);
    try {
      const data = await api.getImages();
      if (data.success && data.images) {
        setImages(data.images);
        if (data.images.length > 0 && selectFirst) {
          const first = data.images[0];
          const filename = getFilenameFromMeta(first);
          if (filename) {
            setSelectedMeta(first);
            setSelectedImageUrl(`/uploads/${encodeURIComponent(filename)}`);
            setPaletteName(first.paletteName || getFilenameWithoutExt(filename));
            if (!first.colorPalette || !Array.isArray(first.colorPalette) || first.colorPalette.length === 0) {
              setPaletteGenerating(true);
              api
                .generatePalette(filename)
                .then((result) => {
                  if (result.success && result.palette) {
                    setSelectedMeta((prev) =>
                      prev && getFilenameFromMeta(prev) === filename ? { ...prev, colorPalette: result.palette } : prev
                    );
                    setImages((prev) =>
                      prev.map((m) => (getFilenameFromMeta(m) === filename ? { ...m, colorPalette: result.palette } : m))
                    );
                  }
                })
                .finally(() => setPaletteGenerating(false));
            }
          }
        }
      } else {
        setImages([]);
        showMessage(data.message || 'Could not load images', true);
      }
    } catch (error) {
      console.error('Failed to load image list:', error);
      setImages([]);
      showMessage('Error loading image list.', true);
    } finally {
      setIsLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    loadImages();
  }, []);

  // Update selected image when images change (e.g. after upload)
  useEffect(() => {
    if (images.length > 0 && selectedMeta) {
      const filename = getFilenameFromMeta(selectedMeta);
      const stillExists = images.some((m) => getFilenameFromMeta(m) === filename);
      if (!stillExists) {
        const first = images[0];
        const fn = getFilenameFromMeta(first);
        if (fn) {
          setSelectedMeta(first);
          setSelectedImageUrl(`/uploads/${encodeURIComponent(fn)}`);
          setPaletteName(first.paletteName || getFilenameWithoutExt(fn));
        }
      }
    }
  }, [images]);

  const handleSelectImage = useCallback((meta, imageUrl) => {
    setIsSamplingMode(false);
    setCurrentSampledColor(null);
    setSelectedMeta(meta);
    setSelectedImageUrl(imageUrl);
    setPaletteName(meta.paletteName || getFilenameWithoutExt(getFilenameFromMeta(meta) || ''));

    if (meta.colorPalette && Array.isArray(meta.colorPalette) && meta.colorPalette.length > 0) {
      setPaletteGenerating(false);
    } else {
      setPaletteGenerating(true);
      const filename = getFilenameFromMeta(meta);
      if (filename) {
        api
          .generatePalette(filename)
          .then((result) => {
            if (result.success && result.palette) {
              setSelectedMeta((prev) =>
                prev && getFilenameFromMeta(prev) === filename
                  ? { ...prev, colorPalette: result.palette }
                  : prev
              );
              setImages((prev) =>
                prev.map((m) =>
                  getFilenameFromMeta(m) === filename
                    ? { ...m, colorPalette: result.palette }
                    : m
                )
              );
            }
          })
          .finally(() => setPaletteGenerating(false));
      } else {
        setPaletteGenerating(false);
      }
    }
  }, []);

  const handleUpload = useCallback(
    async (formData) => {
      showMessage('Processing...');
      try {
        const result = await api.upload(formData);
        if (result.success) {
          showMessage('Success: Image processed.');
          await loadImages({ selectFirst: false });
          if (result.metadata) {
            const filename = getFilenameFromMeta(result.metadata);
            if (filename) {
              handleSelectImage(result.metadata, `/uploads/${encodeURIComponent(filename)}`);
            }
          }
          return result;
        } else {
          showMessage(result.message || 'An error occurred.', true);
          return result;
        }
      } catch (error) {
        showMessage('Submission failed. Check console.', true);
        return { success: false };
      }
    },
    [showMessage, loadImages, handleSelectImage]
  );

  const handleDeleteImage = useCallback(
    async (filename, listItemMeta) => {
      if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;
      showMessage('Deleting...');
      try {
        const result = await api.deleteImage(filename);
        if (result.success) {
          showMessage('Image deleted successfully.');
          const wasSelected = selectedMeta && getFilenameFromMeta(selectedMeta) === filename;
          setImages((prev) => prev.filter((m) => getFilenameFromMeta(m) !== filename));
          if (wasSelected) {
            setSelectedMeta(null);
            setSelectedImageUrl('');
            setPaletteName('');
            const remaining = images.filter((m) => getFilenameFromMeta(m) !== filename);
            if (remaining.length > 0) {
              const first = remaining[0];
              const fn = getFilenameFromMeta(first);
              if (fn) {
                handleSelectImage(first, `/uploads/${encodeURIComponent(fn)}`);
              }
            }
          }
        } else {
          showMessage(result.message || 'Error deleting image.', true);
        }
      } catch (error) {
        showMessage('Failed to delete image.', true);
      }
    },
    [selectedMeta, images, showMessage, handleSelectImage]
  );

  const handleDeleteSwatch = useCallback(
    async (hexColor) => {
      if (!selectedMeta) return;
      const palette = selectedMeta.colorPalette || [];
      if (!Array.isArray(palette) || !palette.includes(hexColor)) return;

      const newPalette = palette.filter((c) => c !== hexColor);
      const updatedMeta = { ...selectedMeta, colorPalette: newPalette };
      setSelectedMeta(updatedMeta);
      setImages((prev) =>
        prev.map((m) =>
          getFilenameFromMeta(m) === getFilenameFromMeta(selectedMeta)
            ? updatedMeta
            : m
        )
      );

      const filename = getFilenameFromMeta(selectedMeta);
      if (filename) {
        try {
          const result = await api.savePalette(filename, newPalette);
          if (!result.success) {
            showMessage(result.message || 'Error saving palette.', true);
          }
        } catch (error) {
          showMessage('Network error saving palette update.', true);
        }
      }
    },
    [selectedMeta, showMessage]
  );

  const handleToggleSamplingMode = useCallback(() => {
    if (!selectedMeta) {
      showMessage('Select an image first.', true);
      return;
    }
    if (isSamplingMode) {
      setIsSamplingMode(false);
      setCurrentSampledColor(null);
      document.body.classList.remove('sampling-active');
    } else {
      setIsSamplingMode(true);
      setCurrentSampledColor(null);
      document.body.classList.add('sampling-active');
    }
  }, [selectedMeta, isSamplingMode, showMessage]);

  useEffect(() => {
    return () => document.body.classList.remove('sampling-active');
  }, []);

  const handleDoubleClickAddColor = useCallback(() => {
    if (!isSamplingMode || !currentSampledColor || !selectedMeta) return;

    const palette = selectedMeta.colorPalette || [];
    if (palette.includes(currentSampledColor)) return;

    const newPalette = [...palette, currentSampledColor];
    const updatedMeta = { ...selectedMeta, colorPalette: newPalette };
    setSelectedMeta(updatedMeta);
    setImages((prev) =>
      prev.map((m) =>
        getFilenameFromMeta(m) === getFilenameFromMeta(selectedMeta)
          ? updatedMeta
          : m
      )
    );

    const filename = getFilenameFromMeta(selectedMeta);
    if (filename) {
      api.savePalette(filename, newPalette).catch((err) => {
        showMessage('Error saving palette.', true);
      });
    }
  }, [isSamplingMode, currentSampledColor, selectedMeta, showMessage]);

  const handlePaletteNameBlur = useCallback(() => {
    if (!selectedMeta || !paletteName.trim()) return;
    const filename = getFilenameFromMeta(selectedMeta);
    if (!filename || selectedMeta.paletteName === paletteName.trim()) return;

    api
      .saveMetadata(filename, paletteName.trim())
      .then((result) => {
        if (result.success) {
          showMessage('Palette name updated.', false);
          setSelectedMeta((prev) => (prev ? { ...prev, paletteName: paletteName.trim() } : prev));
          setImages((prev) =>
            prev.map((m) =>
              getFilenameFromMeta(m) === filename
                ? { ...m, paletteName: paletteName.trim() }
                : m
            )
          );
        } else {
          showMessage(result.message || 'Error saving name.', true);
        }
      })
      .catch(() => showMessage('Network error saving palette name.', true));
  }, [selectedMeta, paletteName, showMessage]);

  const handleExport = useCallback(() => {
    if (!selectedMeta) {
      showMessage('Please select an image first.', true);
      return;
    }

    const palette = selectedMeta.colorPalette || [];
    const name = paletteName.trim() || getFilenameWithoutExt(getFilenameFromMeta(selectedMeta) || '') || 'palette';

    if (palette.length === 0) {
      showMessage('No colors in the current palette to export.', true);
      return;
    }

    const jsonData = { name, colors: palette };
    const blob = new Blob([JSON.stringify(jsonData, null, 2) + '\n'], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const downloadFilenameBase = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '') || 'palette';
    link.download = `${downloadFilenameBase}.json`;
    link.href = url;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showMessage(`Export initiated for "${link.download}". Check your browser downloads.`);
  }, [selectedMeta, paletteName, showMessage]);

  const palette = selectedMeta?.colorPalette;
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <>
      <Header theme={theme} onToggleTheme={toggleTheme} />
      <main>
        <div id="leftPanel">
          <UploadForm onSubmit={handleUpload} message={message} />
          <ImageLibrary
            images={images}
            selectedMeta={selectedMeta}
            onSelectImage={handleSelectImage}
            onDeleteImage={handleDeleteImage}
            isLoading={isLoading}
          />
        </div>
        <PaletteDisplay
          palette={palette}
          isGenerating={paletteGenerating}
          isSamplingMode={isSamplingMode}
          currentSampledColor={currentSampledColor}
          onToggleSamplingMode={handleToggleSamplingMode}
          onDeleteSwatch={handleDeleteSwatch}
          paletteName={paletteName}
          onPaletteNameChange={setPaletteName}
          onExport={handleExport}
          onPaletteNameBlur={handlePaletteNameBlur}
          selectedMeta={selectedMeta}
        />
        <ImageViewer
          imageUrl={selectedImageUrl}
          isSamplingMode={isSamplingMode}
          onSampledColorChange={setCurrentSampledColor}
          onDoubleClickAddColor={handleDoubleClickAddColor}
        />
      </main>
    </>
  );
}

export default App;
