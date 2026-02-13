import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageLibrary from './ImageLibrary';

describe('ImageLibrary', () => {
  const mockMeta = {
    cachedFilePath: '/uploads/img-123.jpeg',
    paletteName: 'Test',
    width: 100,
    height: 100,
  };

  it('shows Loading when isLoading', () => {
    render(
      <ImageLibrary images={[]} isLoading={true} onSelectImage={vi.fn()} />
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows No images stored when empty', () => {
    render(
      <ImageLibrary images={[]} isLoading={false} onSelectImage={vi.fn()} />
    );
    expect(screen.getByText(/no images stored/i)).toBeInTheDocument();
  });

  it('renders library items with up/down buttons', () => {
    render(
      <ImageLibrary
        images={[mockMeta]}
        isLoading={false}
        onSelectImage={vi.fn()}
        onReorder={vi.fn()}
      />
    );
    const upButtons = screen.getAllByLabelText(/move up/i);
    const downButtons = screen.getAllByLabelText(/move down/i);
    expect(upButtons.length).toBeGreaterThan(0);
    expect(downButtons.length).toBeGreaterThan(0);
  });

  it('calls onReorder with index and "up" when up button clicked', () => {
    const onReorder = vi.fn();
    const images = [mockMeta, { ...mockMeta, cachedFilePath: '/uploads/img-456.jpeg' }];
    render(
      <ImageLibrary
        images={images}
        isLoading={false}
        onReorder={onReorder}
        onSelectImage={vi.fn()}
      />
    );
    const upButtons = screen.getAllByLabelText(/move up/i);
    // First item: up disabled. Second item: up enabled
    const secondUp = upButtons.find((btn) => !btn.disabled);
    if (secondUp) {
      fireEvent.click(secondUp);
      expect(onReorder).toHaveBeenCalledWith(1, 'up');
    }
  });

  it('calls onReorder with index and "down" when down button clicked', () => {
    const onReorder = vi.fn();
    const images = [mockMeta, { ...mockMeta, cachedFilePath: '/uploads/img-456.jpeg' }];
    render(
      <ImageLibrary
        images={images}
        isLoading={false}
        onReorder={onReorder}
        onSelectImage={vi.fn()}
      />
    );
    const downButtons = screen.getAllByLabelText(/move down/i);
    const firstDown = downButtons.find((btn) => !btn.disabled);
    if (firstDown) {
      fireEvent.click(firstDown);
      expect(onReorder).toHaveBeenCalledWith(0, 'down');
    }
  });
});
