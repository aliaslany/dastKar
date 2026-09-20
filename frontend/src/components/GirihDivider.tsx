// Signature element: a repeating Persian "girih" star-and-polygon strapwork band,
// used sparingly as a section divider — evokes tilework without being a literal tile photo.
export default function GirihDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`w-full overflow-hidden ${className}`} aria-hidden="true">
      <svg viewBox="0 0 240 16" preserveAspectRatio="xMidYMid meet" className="w-full h-4 text-firouzeh/40">
        <defs>
          <pattern id="girih-strip" width="24" height="16" patternUnits="userSpaceOnUse">
            <path
              d="M12 1 L20 8 L12 15 L4 8 Z M0 8 L4 4 M0 8 L4 12 M24 8 L20 4 M24 8 L20 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="240" height="16" fill="url(#girih-strip)" />
      </svg>
    </div>
  );
}
