export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="AutoCiclo"
    >
      <defs>
        <linearGradient id="acg" x1="0" y1="0" x2="48" y2="48">
          <stop offset="0" stopColor="#338dff" />
          <stop offset="1" stopColor="#1a6cf5" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="12" fill="url(#acg)" />
      <path
        d="M14 33 V20 a10 10 0 0 1 20 0"
        stroke="white"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M14 33 a4 4 0 0 0 8 0 v-2 h-8 z"
        fill="#2dd4bf"
      />
      <path
        d="M34 33 a4 4 0 0 1-8 0 v-2 h8 z"
        fill="#2dd4bf"
      />
      <path
        d="M19 20l3.5 3.5 6.5-7"
        stroke="#2dd4bf"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ withText = true, size = 36 }: { withText?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      {withText && (
        <span className="text-xl font-extrabold tracking-tight">
          Auto<span className="text-brand-600 dark:text-brand-400">Ciclo</span>
        </span>
      )}
    </div>
  );
}

export function LogoHorizontal() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={32} />
      <span className="text-xl font-extrabold tracking-tight">
        Auto<span className="text-brand-600 dark:text-brand-400">Ciclo</span>
      </span>
    </div>
  );
}
