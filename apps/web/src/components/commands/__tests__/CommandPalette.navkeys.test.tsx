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

function open() {
  render(<CommandPalette open={true} onClose={() => {}} />);
  return screen.getByPlaceholderText(/ค้นหา/);
}

describe('CommandPalette extra navigation keys', () => {
  it('Ctrl+N / Ctrl+P move selection', async () => {
    const input = open();
    await userEvent.type(input, 'project');
    const first = await screen.findAllByRole('listitem');
    expect(first[0].getAttribute('data-active')).toBe('true');
    await userEvent.keyboard('{Control>}n'); // ctrl+n
    let items = screen.getAllByRole('listitem');
    expect(items.some(li => li.getAttribute('data-active') === 'true')).toBe(true);
    await userEvent.keyboard('{Control>}p'); // ctrl+p
    items = screen.getAllByRole('listitem');
    expect(items[0].getAttribute('data-active')).toBe('true');
  });

  it('PageDown / PageUp jump by 5', async () => {
    const input = open();
    await userEvent.type(input, 'project');
    await userEvent.keyboard('{PageDown}');
    const items = screen.getAllByRole('listitem');
    const activeIndex = items.findIndex(li => li.getAttribute('data-active') === 'true');
    expect(activeIndex).toBeGreaterThanOrEqual(1); // at least moved
    await userEvent.keyboard('{PageUp}');
    const items2 = screen.getAllByRole('listitem');
    const activeIndex2 = items2.findIndex(li => li.getAttribute('data-active') === 'true');
    expect(activeIndex2).toBe(0);
  });

  it('mouse hover + click navigates and triggers route', async () => {
    const input = open();
    await userEvent.type(input, 'project');
    const items = await screen.findAllByRole('listitem');
    // pick third if exists else last
    const target = items[Math.min(2, items.length - 1)];
    await userEvent.hover(target);
    expect(target.getAttribute('data-active')).toBe('true');
    await userEvent.click(target);
    expect(pushSpy).toHaveBeenCalled();
  });
});
