import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';
import * as nextRouter from 'next/router';

beforeEach(() => {
  (nextRouter as any).useRouter = () => ({ push: vi.fn() });
  localStorage.clear();
});

function open() {
  render(<CommandPalette open={true} onClose={() => {}} />);
  return screen.getByPlaceholderText(/ค้นหา/);
}

describe('CommandPalette Home/End & history', () => {
  it('Home and End jump to top/bottom', async () => {
    const input = open();
    await userEvent.type(input, 'project');
    const items = await screen.findAllByRole('listitem');
    expect(items[0].getAttribute('data-active')).toBe('true');
    await userEvent.keyboard('{End}');
    const itemsAfterEnd = screen.getAllByRole('listitem');
    expect(itemsAfterEnd[itemsAfterEnd.length - 1].getAttribute('data-active')).toBe('true');
    await userEvent.keyboard('{Home}');
    const itemsAfterHome = screen.getAllByRole('listitem');
    expect(itemsAfterHome[0].getAttribute('data-active')).toBe('true');
  });

  it('stores query in history and cycles with Ctrl+ArrowUp/Down', async () => {
  const { rerender } = render(<CommandPalette open={true} onClose={() => {}} />);
  const input = screen.getByPlaceholderText(/ค้นหา/);
  await userEvent.type(input, 'map');
  // close via prop change to persist
  rerender(<CommandPalette open={false} onClose={() => {}} />);
  // reopen to load history
  rerender(<CommandPalette open={true} onClose={() => {}} />);
  const input2 = screen.getByPlaceholderText(/ค้นหา/);
  await userEvent.type(input2, 'proj');
  await userEvent.keyboard('{Control>}{ArrowUp}{/Control}');
  expect((input2 as HTMLInputElement).value).toBe('map');
  await userEvent.keyboard('{Control>}{ArrowDown}{/Control}');
  expect((input2 as HTMLInputElement).value).toBe('');
  });
});
