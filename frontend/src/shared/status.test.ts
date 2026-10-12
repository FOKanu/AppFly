import { describe, it, expect } from 'vitest';
import { JOB_STATUSES, STATUS_LABELS, statusLabel } from './status';
import { statusLabel as queueStatusLabel } from '../features/queue/types';

describe('statusLabel', () => {
  it('has a human label for every status', () => {
    for (const status of JOB_STATUSES) {
      expect(statusLabel(status)).toBe(STATUS_LABELS[status]);
    }
  });

  it('maintains the correct order of JOB_STATUSES', () => {
    expect(JOB_STATUSES).toEqual([
      "inbox",
      "shortlist",
      "draft",
      "approved",
      "applied",
      "skipped"
    ]);
  });

  it('returns the raw status string for unknown values', () => {
    expect(statusLabel("archived")).toBe("archived");
  });

  it('handles prototype property names without collision', () => {
    expect(statusLabel("constructor")).toBe("constructor");
    expect(statusLabel("toString")).toBe("toString");
  });

  it('re-exports the same statusLabel function', () => {
    expect(queueStatusLabel).toBe(statusLabel);
    expect(queueStatusLabel("archived")).toBe("archived");
  });
});
