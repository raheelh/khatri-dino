import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f5f5f5] px-6 text-center text-slate-900">
      <div className="flex flex-col items-center gap-3">
        <div className="text-5xl" aria-label="Dino">🦖</div>
        <h1 className="text-3xl font-black tracking-tight">
          {context.username ?? 'User'}'s Dino Run
        </h1>
        <p className="max-w-xs text-sm text-slate-600">
          Jump over obstacles and survive as long as you can.
        </p>
      </div>

      <button
        type="button"
        className="rounded-full bg-[#2d2d2d] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-slate-300 transition-transform hover:scale-[1.02] active:scale-[0.98]"
        onClick={(event) => requestExpandedMode(event.nativeEvent, 'game')}
      >
        Tap to Start
      </button>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
