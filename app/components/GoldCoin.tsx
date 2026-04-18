export default function GoldCoin({ size = 18 }: { size?: number }) {
  const id = `coin-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff176" />
          <stop offset="40%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
        <radialGradient id={`${id}-rim`} cx="50%" cy="50%" r="50%">
          <stop offset="70%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#92400e" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rim / shadow */}
      <circle cx="12" cy="13" r="10" fill={`url(#${id}-rim)`} opacity="0.6" />

      {/* Coin face */}
      <circle cx="12" cy="11.5" r="10" fill={`url(#${id}-face)`} filter={`url(#${id}-glow)`} />

      {/* Edge highlight */}
      <circle
        cx="12"
        cy="11.5"
        r="9.3"
        fill="none"
        stroke="#fef08a"
        strokeWidth="0.6"
        opacity="0.5"
      />

      {/* Dollar sign shadow for depth */}
      <text
        x="12.5"
        y="16.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="#7c2d12"
        opacity="0.5"
      >
        $
      </text>

      {/* Dollar sign */}
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="13"
        fontWeight="bold"
        fontFamily="Georgia, serif"
        fill="#78350f"
        opacity="1"
      >
        $
      </text>

      {/* Shine streak */}
      <ellipse
        cx="9"
        cy="8.5"
        rx="2.2"
        ry="1"
        fill="white"
        opacity="0.35"
        transform="rotate(-30 9 8.5)"
      />
    </svg>
  );
}
