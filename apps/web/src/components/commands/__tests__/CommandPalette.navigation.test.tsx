import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommandPalette } from '../CommandPalette';
import * as nextRouter from 'next/router';

let pushSpy: any;

beforeEach(() => {
  pushSpy = vi.fn();
  (nextRouter as any).useRouter = () => ({ push: pushSpy });
});

function setup() {
  render(<CommandPalette open={true} onClose={() => {}} />);
  return screen.getByPlaceholderText(/ค้นหา/);
}

describe('CommandPalette keyboard navigation', () => {
  it('moves active item with arrow keys and opens on Enter', async () => {
    const input = setup();
    await userEvent.type(input, 'project');
    // ensure results
    const items = await screen.findAllByRole('listitem');
    expect(items.length).toBeGreaterThan(1);
    // initial index 0 active
    expect(items[0].getAttribute('data-active')).toBe('true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const updated = screen.getAllByRole('listitem');
    // third item active now (index 2)
    expect(updated[2].getAttribute('data-active')).toBe('true');
    await userEvent.keyboard('{Enter}');
    expect(pushSpy).toHaveBeenCalledTimes(1);
  });

  it('highlights query within route and desc', async () => {
    const input = setup();
    await userEvent.type(input, 'detail');
    // item with Project Detail should appear
    const list = await screen.findAllByRole('listitem');
    const target = list.find(li => li.getAttribute('data-label') === 'Project Detail');
    expect(target).toBeTruthy();
    const highlights = target!.querySelectorAll('[data-testid="cp-highlight"]');
    expect(highlights.length).toBeGreaterThan(0);
  });
});
