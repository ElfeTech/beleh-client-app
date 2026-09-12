/** Illustrated SVGs for datasource connector empty / error states. */

interface IconProps {
  readonly className?: string;
}

/** Snapped data cable , load / network failure */
export function ConnectionLoadErrorIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="dsErrCable"
          x1="12"
          y1="20"
          x2="84"
          y2="76"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--accent-teal-400, #2dd4bf)" />
          <stop offset="1" stopColor="var(--accent-teal-700, #0f766e)" />
        </linearGradient>
        <linearGradient
          id="dsErrSpark"
          x1="40"
          y1="36"
          x2="56"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fb7185" />
          <stop offset="1" stopColor="#e11d48" />
        </linearGradient>
      </defs>
      {/* soft plate */}
      <circle cx="48" cy="48" r="40" fill="var(--ds-surface-muted, #f1f5f9)" opacity="0.9" />
      <circle
        cx="48"
        cy="48"
        r="32"
        stroke="var(--border-primary, #e2e8f0)"
        strokeWidth="1.25"
        strokeDasharray="3 5"
        opacity="0.7"
      />
      {/* left plug */}
      <path
        d="M14 42h18c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4H14"
        stroke="url(#dsErrCable)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 40v-6M28 40v-6M22 62v6M28 62v6"
        stroke="url(#dsErrCable)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* right plug */}
      <path
        d="M82 42H64c-2.2 0-4 1.8-4 4v4c0 2.2 1.8 4 4 4h18"
        stroke="url(#dsErrCable)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M74 40v-6M68 40v-6M74 62v6M68 62v6"
        stroke="url(#dsErrCable)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* spark gap */}
      <path
        d="M42 40l6 8-5 4 8 10"
        stroke="url(#dsErrSpark)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="48" cy="50" r="2.5" fill="#fb7185" />
      <path
        d="M50 34l2.5 4.5M58 42l4 1.5M38 56l-4 2"
        stroke="#fb7185"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
}

/** Broken key / revoked grant , reconnect required */
export function ConnectionReconnectIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="dsRecKey"
          x1="20"
          y1="24"
          x2="76"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--accent-teal-300, #5eead4)" />
          <stop offset="1" stopColor="var(--accent-teal-700, #0f766e)" />
        </linearGradient>
        <linearGradient
          id="dsRecWarn"
          x1="58"
          y1="18"
          x2="78"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fdba74" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="40" fill="var(--ds-surface-muted, #f1f5f9)" opacity="0.9" />
      {/* orbit */}
      <ellipse
        cx="48"
        cy="48"
        rx="30"
        ry="18"
        stroke="var(--accent-teal-500, #14b8a6)"
        strokeWidth="1.5"
        strokeDasharray="4 6"
        opacity="0.35"
        transform="rotate(-18 48 48)"
      />
      {/* key head */}
      <circle cx="36" cy="42" r="12" stroke="url(#dsRecKey)" strokeWidth="3.25" />
      <circle cx="36" cy="42" r="4.5" fill="url(#dsRecKey)" opacity="0.35" />
      {/* key shaft + teeth (broken mid-shaft) */}
      <path d="M46 44h14" stroke="url(#dsRecKey)" strokeWidth="3.25" strokeLinecap="round" />
      <path
        d="M66 44h8M74 44v8M74 52h-4"
        stroke="url(#dsRecKey)"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      {/* fracture marks */}
      <path
        d="M60 40l4 4-4 4"
        stroke="url(#dsRecWarn)"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* refresh arc badge */}
      <circle
        cx="68"
        cy="28"
        r="11"
        fill="var(--bg-modal, #fff)"
        stroke="url(#dsRecWarn)"
        strokeWidth="1.75"
      />
      <path
        d="M64 28a4.5 4.5 0 1 1 1.2 3.1"
        stroke="url(#dsRecWarn)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M63.5 25.5v3.2h3.2"
        stroke="url(#dsRecWarn)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Flatlined signal , unhealthy org grant */
export function ConnectionUnhealthyIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="dsUnhLine"
          x1="14"
          y1="48"
          x2="82"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--accent-teal-500, #14b8a6)" />
          <stop offset="0.45" stopColor="#fb7185" />
          <stop offset="1" stopColor="var(--accent-teal-600, #0d9488)" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="40" fill="var(--ds-surface-muted, #f1f5f9)" opacity="0.9" />
      {/* monitor frame */}
      <rect
        x="18"
        y="26"
        width="60"
        height="40"
        rx="8"
        stroke="var(--border-primary, #cbd5e1)"
        strokeWidth="2"
        fill="var(--bg-modal, #fff)"
      />
      <path
        d="M40 66h16v4a2 2 0 0 1-2 2H42a2 2 0 0 1-2-2v-4z"
        fill="var(--border-primary, #cbd5e1)"
      />
      {/* flatline with break */}
      <path
        d="M26 48h12l4-10 6 20 5-14 3 4h8"
        stroke="url(#dsUnhLine)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="70" cy="48" r="3" fill="#fb7185" />
      <path
        d="M66 34l2 3.5M74 36l-1.5 3"
        stroke="#fb7185"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}

/** Empty org invite , first connect */
export function ConnectionEmptyOrgsIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="dsEmptyHex"
          x1="24"
          y1="18"
          x2="72"
          y2="78"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--accent-teal-400, #2dd4bf)" />
          <stop offset="1" stopColor="var(--accent-teal-700, #0f766e)" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="40" fill="var(--ds-surface-muted, #f1f5f9)" opacity="0.9" />
      {/* constellation hexes */}
      <path
        d="M48 22l12 7v14l-12 7-12-7V29l12-7z"
        stroke="url(#dsEmptyHex)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="url(#dsEmptyHex)"
        fillOpacity="0.12"
      />
      <path
        d="M28 48l8 4.5v9L28 66l-8-4.5v-9L28 48z"
        stroke="url(#dsEmptyHex)"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d="M68 48l8 4.5v9L68 66l-8-4.5v-9L68 48z"
        stroke="url(#dsEmptyHex)"
        strokeWidth="2"
        strokeLinejoin="round"
        opacity="0.55"
      />
      {/* link nodes */}
      <path
        d="M40 40l-6 10M56 40l6 10"
        stroke="url(#dsEmptyHex)"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="2 3"
        opacity="0.7"
      />
      <circle cx="48" cy="36" r="3" fill="url(#dsEmptyHex)" />
      <circle cx="28" cy="54" r="2.25" fill="url(#dsEmptyHex)" opacity="0.7" />
      <circle cx="68" cy="54" r="2.25" fill="url(#dsEmptyHex)" opacity="0.7" />
    </svg>
  );
}

/** Empty project shelf */
export function ConnectionEmptyProjectsIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="dsEmptyProj"
          x1="20"
          y1="24"
          x2="76"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="var(--accent-teal-400, #2dd4bf)" />
          <stop offset="1" stopColor="var(--accent-teal-700, #0f766e)" />
        </linearGradient>
      </defs>
      <circle cx="48" cy="48" r="40" fill="var(--ds-surface-muted, #f1f5f9)" opacity="0.9" />
      <path
        d="M24 38h20l4 4h24a4 4 0 0 1 4 4v22a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V42a4 4 0 0 1 4-4z"
        stroke="url(#dsEmptyProj)"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="url(#dsEmptyProj)"
        fillOpacity="0.1"
      />
      <path
        d="M28 52h40M28 60h28"
        stroke="url(#dsEmptyProj)"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.45"
      />
      <circle
        cx="66"
        cy="30"
        r="10"
        fill="var(--bg-modal, #fff)"
        stroke="url(#dsEmptyProj)"
        strokeWidth="2"
      />
      <path
        d="M66 26v8M62 30h8"
        stroke="url(#dsEmptyProj)"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}
