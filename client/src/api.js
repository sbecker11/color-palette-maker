/**
 * API helpers for Color Palette Maker
 */

const api = {
  async getImages() {
    const response = await fetch('/api/images');
    return response.json();
  },

  async upload(formData) {
    const response = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  async generatePalette(filename, opts = {}) {
    const { regenerate = false } = opts;
    const url = regenerate
      ? `/api/palette/${encodeURIComponent(filename)}?regenerate=true`
      : `/api/palette/${encodeURIComponent(filename)}`;
    const response = await fetch(url, { method: 'POST' });
    return response.json();
  },

  async savePalette(filename, colorPalette) {
    const response = await fetch(`/api/palette/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ colorPalette }),
    });
    return response.json();
  },

  async saveMetadata(filename, paletteName) {
    const response = await fetch(`/api/metadata/${encodeURIComponent(filename)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paletteName }),
    });
    return response.json();
  },

  async deleteImage(filename) {
    const response = await fetch(`/api/images/${encodeURIComponent(filename)}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async duplicateImage(filename) {
    const response = await fetch(`/api/images/${encodeURIComponent(filename)}/duplicate`, {
      method: 'POST',
    });
    return response.json();
  },

  async reorderImages(filenames) {
    const response = await fetch('/api/images/order', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filenames }),
    });
    return response.json();
  },
};

export default api;
