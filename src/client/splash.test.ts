import { afterEach, describe, expect, it, vi } from 'vitest';

let requestExpandedModeMock: ReturnType<typeof vi.fn>;

vi.mock('@devvit/web/client', () => {
  requestExpandedModeMock = vi.fn();

  return {
    context: {
      username: 'test-user',
    },
    requestExpandedMode: requestExpandedModeMock,
  };
});

afterEach(() => {
  requestExpandedModeMock?.mockReset();
});

describe('Splash', () => {
  it('clicking "Tap to Start" opens the game view', async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await import('./splash');
    await new Promise((resolve) => setTimeout(resolve, 0));

    const startButton = Array.from(document.querySelectorAll('button')).find(
      (button) => /tap to start/i.test(button.textContent ?? '')
    );

    expect(startButton).toBeTruthy();

    startButton!.click();

    expect(requestExpandedModeMock).toHaveBeenCalledTimes(1);
    expect(requestExpandedModeMock).toHaveBeenCalledWith(
      expect.any(Object),
      'game'
    );
  });
});
