/** The Maplecake maple leaf. Takes its colour from the surrounding text, so it works on any background. */
export function LeafMark({ className }: { className?: string }) {
  return (
    <svg viewBox="4 3 56 54" width="1em" height="1em" fill="currentColor" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M32.0 5.0 L35.4 12.6 L39.0 9.8 L39.8 19.2 L48.8 13.8 L46.8 25.2 L57.6 24.6 L51.0 34.4 L54.4 42.2 L42.4 39.4 L34.6 43.6 L34.6 55.0 L29.4 55.0 L29.4 43.6 L21.6 39.4 L9.6 42.2 L13.0 34.4 L6.4 24.6 L17.2 25.2 L15.2 13.8 L24.2 19.2 L25.0 9.8 L28.6 12.6 L32.0 5.0 Z" />
    </svg>
  );
}
