export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="shrink-0">
      <rect x="0" y="0" width="64" height="64" rx="15" fill="#2B193D" />
      <rect x="14" y="22" width="36" height="5" rx="2.5" fill="#FFF7EA" />
      <rect x="29.5" y="22" width="5" height="30" rx="2.5" fill="#FFF7EA" />
      <circle cx="11.5" cy="24.5" r="3.4" fill="#F4D8E8" />
      <circle cx="52.5" cy="24.5" r="3.4" fill="#2A9D8F" />
      <rect x="23" y="52" width="18" height="4" rx="2" fill="#6E4B7E" />
    </svg>
  );
}
