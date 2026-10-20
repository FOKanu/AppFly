import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, it, expect } from 'vitest';

// Mock all the dependencies first
vi.mock('./useTonight', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useTonight: vi.fn(),
    readPreview: vi.fn(),
  };
});

vi.mock('../queue/jobsApi', () => ({
  patchJobStatus: vi.fn(),
}));

import { TonightPage } from './TonightPage';
import { useTonight } from './useTonight';
import { patchJobStatus } from '../queue/jobsApi';

it('shows toast when draft is skipped', async () => {
  // Mock the useTonight hook to return a draft with title "Platform Engineer"
  vi.mocked(useTonight).mockReturnValue({
    snapshot: {
      drafts: [
        {
          source_id: '1',
          source: 'api',
          title: 'Platform Engineer',
          company: 'Company',
          status: 'draft',
        },
      ],
    },
    decide: vi.fn(),
  });

  // Mock the patchJobStatus function
  vi.mocked(patchJobStatus).mockResolvedValue(undefined);

  render(
    <MemoryRouter>
      <TonightPage />
    </MemoryRouter>
  );

  // Find and click the Skip button
  const skipButton = await screen.findByRole('button', { name: /^Skip/ });
  skipButton.click();

  // Wait for the toast message to appear
  const toastMessage = await screen.findByText('Platform Engineer skipped.');
  expect(toastMessage).toBeInTheDocument();

  // Ensure no "denied" text appears
  const deniedElement = screen.queryByText(/denied/i);
  expect(deniedElement).toBeNull();
});
