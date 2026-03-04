import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SwatchCard from './SwatchCard';

describe('SwatchCard', () => {
  it('renders label and hex', () => {
    render(<SwatchCard hexColor="#ff0000" label="A" />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('#ff0000')).toBeInTheDocument();
  });

  it('uses default hex when hexColor not provided', () => {
    render(<SwatchCard label="B" />);
    expect(screen.getByText('#808080')).toBeInTheDocument();
  });

  it('has presentation role and title with hex', () => {
    render(<SwatchCard hexColor="#00ff00" label="C" />);
    const card = screen.getByRole('presentation');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('title', '#00ff00');
  });

  it('applies normal class when not highlighted', () => {
    render(<SwatchCard hexColor="#f00" label="D" isHighlighted={false} />);
    const card = screen.getByRole('presentation');
    expect(card).toHaveClass('biz-card-swatch');
    expect(card).not.toHaveClass('biz-card-swatch-highlighted');
  });

  it('applies highlighted class when isHighlighted', () => {
    render(<SwatchCard hexColor="#f00" label="E" isHighlighted={true} />);
    const card = screen.getByRole('presentation');
    expect(card).toHaveClass('biz-card-swatch');
    expect(card).toHaveClass('biz-card-swatch-highlighted');
  });

  it('renders with normalized hex display', () => {
    render(<SwatchCard hexColor="#F00" label="F" />);
    expect(screen.getByText('#ff0000')).toBeInTheDocument();
  });
});
