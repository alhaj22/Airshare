import React from 'react';
import { Monitor } from 'lucide-react';

interface OsIconProps {
  os?: string;
  className?: string;
}

export const OsIcon: React.FC<OsIconProps> = ({ os, className = 'h-3.5 w-3.5' }) => {
  const o = (os || '').toLowerCase();

  if (o.includes('mac') || o.includes('darwin')) {
    // Apple icon SVG
    return (
      <svg
        className={className}
        viewBox="0 0 170 170"
        fill="currentColor"
        aria-label="macOS"
      >
        <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.7-7.94-12-14.58-6.19-9.5-11.04-20.4-14.55-32.69-3.51-12.29-5.27-24.16-5.27-35.61 0-16.14 4.02-29.62 12.06-40.44 8.04-10.82 18.25-16.34 30.63-16.58 4.7 0 10.05 1.25 16.07 3.75 6.01 2.5 10.18 3.8 12.5 3.9 1.77 0 6.06-1.42 12.87-4.25 6.81-2.83 12.53-4.14 17.15-3.94 13.06.63 23.46 5.09 31.2 13.37-11.45 6.94-17.06 16.5-16.84 28.69.23 9.4 3.83 17.26 10.81 23.57 6.98 6.31 15.11 9.9 24.39 10.77-2.3 6.94-5.27 14.28-8.91 22.02zM119.22 31.84c0-7.72 2.76-14.89 8.28-21.51 5.53-6.62 12.21-10.33 20.06-11.13.11 1.09.16 2.06.16 2.92 0 7.61-2.88 14.88-8.63 21.79-5.76 6.91-12.63 10.6-20.61 11.07-.44-1.09-.76-2.14-.95-3.14z" />
      </svg>
    );
  }

  if (o.includes('win')) {
    // Windows grid SVG
    return (
      <svg
        className={className}
        viewBox="0 0 16 16"
        fill="currentColor"
        aria-label="Windows"
      >
        <path d="M0 2.222L6.5 1.3v6.177H0V2.222zm7.5-1.442L16 0v7.477H7.5V.78zm8.5 7.743V16l-8.5-.78v-6.7h8.5zm-9.5.698v6.079L0 13.778V9.22h6.5z" />
      </svg>
    );
  }

  if (o.includes('linux')) {
    // Terminal / Tux minimal SVG
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-label="Linux"
      >
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    );
  }

  return <Monitor className={className} aria-label="Computer" />;
};
