import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useShortcuts } from './useShortcuts';

// Import vi, describe, it, expect, afterEach, beforeEach from vitest
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';

// Mock the localStorage behavior
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Create a test component that uses useShortcuts
const Probe = ({ map }: { map: Record<string, () => void> }) => {
  useShortcuts(map);
  return <div>Test</div>;
};

describe('useShortcuts keydown gating', () => {
  beforeEach(() => {
    mockLocalStorage.clear.mockClear();
    mockLocalStorage.getItem.mockClear();
    vi.restoreAllMocks();
  });

  it('should gate single-key shortcuts when "appfly.shortcuts.single-key" is "off"', () => {
    // Mock localStorage to return "off"
    mockLocalStorage.getItem.mockReturnValue('off');

    const fa = vi.fn();
    const fsa = vi.fn();
    const fgq = vi.fn();
    const fe = vi.fn();
    const fz = vi.fn();

    render(<Probe map={{
      a: fa,
      'shift+a': fsa,
      'g q': fgq,
      escape: fe,
      'mod+z': fz
    }} />);

    // These should NOT be called because single-key shortcuts are gated
    // Use fireEvent.keyDown to match the brief
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'A', shiftKey: true });
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'q' });

    // These should be called because they are not single-key shortcuts
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    expect(fa).not.toHaveBeenCalled();
    expect(fsa).not.toHaveBeenCalled();
    expect(fgq).not.toHaveBeenCalled();
    expect(fe).toHaveBeenCalledTimes(1);
    expect(fz).toHaveBeenCalledTimes(1);
  });

  it('should allow all shortcuts when "appfly.shortcuts.single-key" key is missing', () => {
    // Mock localStorage to return null (key missing)
    mockLocalStorage.getItem.mockReturnValue(null);

    const fa = vi.fn();
    const fsa = vi.fn();
    const fgq = vi.fn();
    const fe = vi.fn();
    const fz = vi.fn();

    render(<Probe map={{
      a: fa,
      'shift+a': fsa,
      'g q': fgq,
      escape: fe,
      'mod+z': fz
    }} />);

    // These should all be called because single-key shortcuts are not gated
    // Use fireEvent.keyDown to match the brief
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'A', shiftKey: true });
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'q' });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    expect(fa).toHaveBeenCalledTimes(1);
    expect(fsa).toHaveBeenCalledTimes(1);
    expect(fgq).toHaveBeenCalledTimes(1);
    expect(fe).toHaveBeenCalledTimes(1);
    expect(fz).toHaveBeenCalledTimes(1);
  });

  it('should allow single-key shortcuts when localStorage throws error', () => {
    // Mock localStorage to throw an error
    mockLocalStorage.getItem.mockImplementation(() => {
      throw new Error('blocked');
    });

    const fa = vi.fn();
    const fsa = vi.fn();
    const fgq = vi.fn();
    const fe = vi.fn();
    const fz = vi.fn();

    render(<Probe map={{
      a: fa,
      'shift+a': fsa,
      'g q': fgq,
      escape: fe,
      'mod+z': fz
    }} />);

    // When localStorage throws error, singleKeyShortcutsOn() returns true (default)
    // So all shortcuts should be allowed
    // Use fireEvent.keyDown to match the brief
    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'A', shiftKey: true });
    fireEvent.keyDown(window, { key: 'g' });
    fireEvent.keyDown(window, { key: 'q' });
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    expect(fa).toHaveBeenCalledTimes(1);
    expect(fsa).toHaveBeenCalledTimes(1);
    expect(fgq).toHaveBeenCalledTimes(1);
    expect(fe).toHaveBeenCalledTimes(1);
    expect(fz).toHaveBeenCalledTimes(1);
  });
});
