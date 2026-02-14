import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import api from './api';

vi.mock('./api');
vi.mock('./App.css', () => ({}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    api.getImages.mockResolvedValue({
      success: true,
      images: [
        {
          cachedFilePath: '/uploads/img-1.jpeg',
          paletteName: 'img-1',
          colorPalette: ['#ff0000', '#00ff00'],
        },
      ],
    });
  });

  it('renders Header with theme toggle', async () => {
    render(<App />);
    await waitFor(() => {
      expect(api.getImages).toHaveBeenCalled();
    });
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders UploadForm', async () => {
    render(<App />);
    await waitFor(() => {
      expect(api.getImages).toHaveBeenCalled();
    });
    expect(screen.getByRole('heading', { name: /source/i })).toBeInTheDocument();
  });

  it('loads images on mount', async () => {
    render(<App />);
    await waitFor(() => {
      expect(api.getImages).toHaveBeenCalled();
    });
  });

  it('shows error message when getImages fails', async () => {
    api.getImages.mockResolvedValue({ success: false, message: 'Server error' });
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/server error|could not load/i)).toBeInTheDocument();
    });
  });

  it('shows error when getImages throws', async () => {
    api.getImages.mockRejectedValue(new Error('Network error'));
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/error loading image list/i)).toBeInTheDocument();
    });
  });

  it('toggles theme when Header toggle is clicked', async () => {
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const toggle = screen.getByRole('button', { name: /theme|dark|light/i });
    fireEvent.click(toggle);
    expect(document.body.dataset.theme).toBe('dark');
  });

  it('calls upload and loadImages on successful upload', async () => {
    api.upload.mockResolvedValue({
      success: true,
      metadata: {
        cachedFilePath: '/uploads/new.jpeg',
        paletteName: 'new',
      },
    });
    api.generatePalette.mockResolvedValue({ success: true, palette: ['#000000'] });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const urlInput = screen.getByLabelText(/image url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/img.jpg' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => expect(api.upload).toHaveBeenCalled());
  });

  it('shows message on upload failure', async () => {
    api.upload.mockResolvedValue({ success: false, message: 'Upload failed' });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const urlInput = screen.getByLabelText(/image url/i);
    fireEvent.change(urlInput, { target: { value: 'https://example.com/img.jpg' } });
    fireEvent.submit(document.querySelector('form'));
    await waitFor(() => {
      expect(screen.getByText(/upload failed|an error occurred/i)).toBeInTheDocument();
    });
  });

  it('calls handleRegenerate when Regenerate button clicked', async () => {
    api.generatePalette.mockResolvedValue({
      success: true,
      palette: ['#111', '#222'],
    });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const regenBtn = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(regenBtn);
    await waitFor(() => expect(api.generatePalette).toHaveBeenCalledWith(expect.any(String), { regenerate: true }));
  });

  it('calls handleExport when Export button clicked', async () => {
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);
    expect(screen.getByText(/export initiated|please select/i)).toBeInTheDocument();
  });

  it('calls handleDuplicate when Duplicate button clicked', async () => {
    api.duplicateImage.mockResolvedValue({
      success: true,
      filename: 'img-1-copy-1.jpeg',
      metadata: { cachedFilePath: '/uploads/img-1-copy-1.jpeg', paletteName: 'img-1-copy-1' },
    });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const dupBtn = screen.getByRole('button', { name: /duplicate/i });
    fireEvent.click(dupBtn);
    await waitFor(() => expect(api.duplicateImage).toHaveBeenCalled());
  });

  it('updates palette name on blur', async () => {
    api.saveMetadata.mockResolvedValue({ success: true });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const input = screen.getByLabelText(/palette name/i);
    fireEvent.change(input, { target: { value: 'New Name' } });
    fireEvent.blur(input);
    await waitFor(() => expect(api.saveMetadata).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByText(/palette name updated/i)).toBeInTheDocument()
    );
  });

  it('calls reorderImages when reorder triggered from ImageLibrary', async () => {
    api.getImages.mockResolvedValue({
      success: true,
      images: [
        { cachedFilePath: '/uploads/img-1.jpeg', paletteName: 'img-1', colorPalette: [] },
        { cachedFilePath: '/uploads/img-2.jpeg', paletteName: 'img-2', colorPalette: [] },
      ],
    });
    api.generatePalette.mockResolvedValue({ success: true, palette: [] });
    api.reorderImages.mockResolvedValue({ success: true });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const downBtns = screen.getAllByRole('button', { name: /move down/i });
    fireEvent.click(downBtns[0]);
    await waitFor(() => expect(api.reorderImages).toHaveBeenCalled());
  });

  it('renders ImageViewer', async () => {
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    expect(document.getElementById('imageViewerContainer')).toBeInTheDocument();
  });

  it('calls handleDeleteSwatch when swatch delete is clicked', async () => {
    api.savePalette.mockResolvedValue({ success: true });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const deleteButtons = screen.getAllByTitle('Delete swatch');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => expect(api.savePalette).toHaveBeenCalled());
  });

  it('shows Select an image first when sampling mode clicked with no selection', async () => {
    api.getImages.mockResolvedValue({ success: true, images: [] });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const placeholderSwatch = screen.getByTitle(/click to sample color/i);
    fireEvent.click(placeholderSwatch);
    expect(screen.getByText(/select an image first/i)).toBeInTheDocument();
  });

  it('calls handleToggleSamplingMode when placeholder swatch clicked with selection', async () => {
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const placeholderSwatch = screen.getByTitle(/click to sample color/i);
    fireEvent.click(placeholderSwatch);
    expect(document.body.classList.contains('sampling-active')).toBe(true);
  });

  it('calls handleDeleteImage when Delete is clicked', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.deleteImage.mockResolvedValue({ success: true });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);
    await waitFor(() => expect(api.deleteImage).toHaveBeenCalled());
    confirmSpy.mockRestore();
  });

  it('triggers generatePalette when selecting image without palette', async () => {
    api.getImages.mockResolvedValue({
      success: true,
      images: [{ cachedFilePath: '/uploads/img-1.jpeg', paletteName: 'img-1' }],
    });
    api.generatePalette.mockResolvedValue({ success: true, palette: ['#aaa', '#bbb'] });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    await waitFor(() => expect(api.generatePalette).toHaveBeenCalledWith('img-1.jpeg'));
  });

  it('handles handleRegenerate failure', async () => {
    api.generatePalette.mockRejectedValue(new Error('Network error'));
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /regenerate/i }));
    await waitFor(() =>
      expect(screen.getByText(/failed to regenerate palette/i)).toBeInTheDocument()
    );
  });

  it('handles savePalette failure in handleDeleteSwatch', async () => {
    api.savePalette.mockResolvedValue({ success: false, message: 'Save failed' });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    const deleteButtons = screen.getAllByTitle('Delete swatch');
    fireEvent.click(deleteButtons[0]);
    await waitFor(() =>
      expect(screen.getByText(/error saving palette|save failed/i)).toBeInTheDocument()
    );
  });

  it('handles handleDuplicate failure', async () => {
    api.duplicateImage.mockResolvedValue({ success: false, message: 'Duplicate failed' });
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /duplicate/i }));
    await waitFor(() =>
      expect(screen.getByText(/failed to duplicate|duplicate failed/i)).toBeInTheDocument()
    );
  });

  it('handles handleExport with palette', async () => {
    const createObjectURL = vi.fn(() => 'blob:mock');
    const revokeObjectURL = vi.fn();
    global.URL.createObjectURL = createObjectURL;
    global.URL.revokeObjectURL = revokeObjectURL;
    render(<App />);
    await waitFor(() => expect(api.getImages).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(createObjectURL).toHaveBeenCalled();
  });
});
