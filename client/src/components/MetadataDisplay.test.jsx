import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetadataDisplay from './MetadataDisplay';

describe('MetadataDisplay', () => {
  it('shows placeholder when no meta', () => {
    render(<MetadataDisplay meta={null} />);
    expect(screen.getByText(/select an image from the list/i)).toBeInTheDocument();
  });

  it('shows metadata when meta provided', () => {
    const meta = {
      cachedFilePath: '/uploads/img-123.jpeg',
      width: 100,
      height: 200,
      format: 'jpeg',
      fileSizeBytes: 1024,
      createdDateTime: '2025-01-01T00:00:00Z',
    };
    render(<MetadataDisplay meta={meta} />);
    expect(screen.getByText(/img-123.jpeg/i)).toBeInTheDocument();
    expect(screen.getByText(/100 x 200/i)).toBeInTheDocument();
    expect(screen.getByText('Format:', { exact: false })).toBeInTheDocument();
  });
});
