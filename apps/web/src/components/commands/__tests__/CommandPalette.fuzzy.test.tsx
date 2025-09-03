import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';
import * as nextRouter from 'next/router';

// Mock next/router
beforeEach(() => {
  (nextRouter as any).useRouter = () => ({ push: vi.fn() });
});

function openPalette() {
  render(<CommandPalette open={true} onClose={() => {}} />);
  return screen.getByPlaceholderText(/ค้นหา/i);
}

describe('CommandPalette fuzzy search', () => {
  it('matches partial spaced query tokens with Fuse', async () => {
    const input = openPalette();
    await userEvent.type(input, 'project lst');
    // Wait for highlight spans to appear (indicates results rendered)
    const highlights = await screen.findAllByTestId('cp-highlight');
    expect(highlights.length).toBeGreaterThan(0);
    // Ensure an li with data-label "Project List" exists among results
    const list = screen.getAllByRole('listitem');
    expect(list.some(li => li.getAttribute('data-label') === 'Project List')).toBe(true);
  });

  it('highlights matched segments (span[data-highlight])', async () => {
    const input = openPalette();
    await userEvent.type(input, 'health');
    const highlighted = await screen.findAllByTestId('cp-highlight');
    // Should contain at least one highlight span with part of query
    expect(highlighted.some(el => /health/i.test(el.textContent || ''))).toBe(true);
  });
});
