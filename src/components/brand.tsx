import { AudioLines } from 'lucide-react';

// A full navigation resets client-side event and session state.
/* eslint-disable @next/next/no-html-link-for-pages */
export function Brand() {
  return (
    <a className="brand" href="/" aria-label="Ritmo DJ, inicio">
      <AudioLines size={31} />
      ritmo<span>●</span>
    </a>
  );
}
