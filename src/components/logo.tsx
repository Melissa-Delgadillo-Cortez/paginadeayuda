export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="LBC Seguros"
    >
      <defs>
        <linearGradient id="lbcg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b4fa0" />
          <stop offset="100%" stopColor="#0e9fd8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#lbcg)" />
      <path
        d="M14 18h7v22h14v6H14V18z"
        fill="#fff"
      />
      <path
        d="M50 20c-2.4-1.5-5.2-2-8-2-6.6 0-11 4.6-11 14s4.4 14 11 14c2.8 0 5.6-.7 8-2v-7c-2 2-4.6 3-7 3-3.6 0-5.6-2.7-5.6-8s2-8 5.6-8c2.4 0 5 1 7 3v-7z"
        fill="#fff"
        opacity="0"
      />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight="bold"
        fontSize="21"
        fill="#fff"
        letterSpacing="1"
      >
        LBC
      </text>
      <text
        x="32"
        y="53"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="7.5"
        fill="#cfe8ff"
        letterSpacing="2"
      >
        SEGUROS
      </text>
    </svg>
  );
}
