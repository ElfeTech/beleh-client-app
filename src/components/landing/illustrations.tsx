import { useId, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** Palette lifted from the Beleh logo (blue → cyan → green) plus a few warm flat-illustration accents. */
export const C = {
  blue: '#0592EE',
  blueDark: '#0770B8',
  cyan: '#00B2CC',
  green: '#52C65A',
  greenDark: '#2FA43C',
  navy: '#0A2540',
  navySoft: '#1F3A5F',
  sky: '#DDF1FD',
  skyDeep: '#BFE4FA',
  mint: '#DBF6E3',
  cloud: '#F4FAFE',
  white: '#FFFFFF',
  sun: '#FFC94D',
  coral: '#FF8F6B',
  paper: '#EEF4F8',
} as const;

const SKIN = ['#F3CBA8', '#DDA676', '#B07548', '#6E4528'] as const;
const HAIR = ['#1B1B2F', '#3A2418', '#7A4B2A', '#C9893F'] as const;

type HairStyle = 'long' | 'short' | 'bun' | 'afro' | 'bob' | 'bald';
type Point = readonly [number, number];

interface PersonProps {
  readonly x: number;
  readonly y: number;
  readonly s?: number;
  readonly skin?: string;
  readonly hair?: string;
  readonly hairStyle?: HairStyle;
  readonly top?: string;
  readonly glasses?: boolean;
  readonly beard?: boolean;
  readonly mood?: 'smile' | 'worry' | 'cheer';
  readonly leftArm?: readonly Point[];
  readonly rightArm?: readonly Point[];
  readonly torsoLength?: number;
  readonly children?: ReactNode;
}

function Arm({ points, color, skin }: { points: readonly Point[]; color: string; skin: string }) {
  const d = points.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px} ${py}`).join(' ');
  const hand = points[points.length - 1];
  return (
    <g>
      <path
        d={d}
        stroke={color}
        strokeWidth="17"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx={hand[0]} cy={hand[1]} r="8.5" fill={skin} />
    </g>
  );
}

/**
 * Flat half-figure. Origin is the centre of the shoulder line; the head sits above it.
 * Everything is plain shapes so scenes can recolour people freely.
 */
export function Person({
  x,
  y,
  s = 1,
  skin = SKIN[1],
  hair = HAIR[0],
  hairStyle = 'short',
  top = C.blue,
  glasses,
  beard,
  mood = 'smile',
  leftArm = [
    [-38, 18],
    [-50, 64],
    [-42, 104],
  ],
  rightArm = [
    [38, 18],
    [50, 64],
    [42, 104],
  ],
  torsoLength = 150,
  children,
}: PersonProps) {
  const mouth =
    mood === 'worry'
      ? 'M -6 -31 Q 0 -35 6 -31'
      : mood === 'cheer'
        ? 'M -9 -35 Q 0 -22 9 -35 Z'
        : 'M -7 -34 Q 0 -28 7 -34';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {hairStyle === 'long' && (
        <path d="M-30 -46 Q-36 -80 0 -80 Q36 -80 30 -46 L38 22 Q0 34 -38 22 Z" fill={hair} />
      )}
      {hairStyle === 'bob' && (
        <path d="M-30 -44 Q-36 -80 0 -80 Q36 -80 30 -44 L31 -16 Q0 -8 -31 -16 Z" fill={hair} />
      )}
      {hairStyle === 'afro' && <circle cx="0" cy="-54" r="39" fill={hair} />}
      {hairStyle === 'bun' && <circle cx="0" cy="-86" r="13" fill={hair} />}

      <Arm points={leftArm} color={top} skin={skin} />
      <path
        d={`M-44 ${torsoLength} L-44 22 Q-44 0 -22 0 L22 0 Q44 0 44 22 L44 ${torsoLength} Z`}
        fill={top}
      />
      <Arm points={rightArm} color={top} skin={skin} />

      <rect x="-8" y="-24" width="16" height="28" rx="6" fill={skin} />
      <path d="M-11 0 L0 15 L11 0 Z" fill={skin} />
      <circle cx="-25" cy="-46" r="4.5" fill={skin} />
      <circle cx="25" cy="-46" r="4.5" fill={skin} />
      <circle cx="0" cy="-48" r="26" fill={skin} />

      {beard && (
        <path
          d="M-25 -42 Q-23 -14 0 -14 Q23 -14 25 -42 Q13 -29 0 -31 Q-13 -29 -25 -42 Z"
          fill={hair}
        />
      )}
      {hairStyle !== 'bald' && (
        <path
          d="M-27 -50 Q-30 -78 0 -78 Q30 -78 27 -50 Q15 -66 0 -64 Q-15 -66 -27 -50 Z"
          fill={hair}
        />
      )}

      <circle cx="-9" cy="-48" r="2.4" fill={C.navy} />
      <circle cx="9" cy="-48" r="2.4" fill={C.navy} />
      {mood === 'worry' && (
        <path
          d="M-14 -57 L-5 -54 M14 -57 L5 -54"
          stroke={C.navy}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      <path
        d={mouth}
        fill={mood === 'cheer' ? C.navy : 'none'}
        stroke={C.navy}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {glasses && (
        <g fill="none" stroke={C.navy} strokeWidth="2">
          <circle cx="-9" cy="-48" r="7.5" />
          <circle cx="9" cy="-48" r="7.5" />
          <path d="M-1.5 -48 L1.5 -48" />
        </g>
      )}
      {children}
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/*  Reusable props                                                             */
/* -------------------------------------------------------------------------- */

export function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 C-30 -20 -34 -52 -14 -70 C-6 -44 -2 -22 0 0Z" fill={C.green} />
      <path d="M0 0 C26 -22 36 -56 20 -80 C6 -52 2 -24 0 0Z" fill={C.greenDark} />
      <path d="M0 0 C-4 -30 4 -60 2 -88 C14 -56 10 -26 0 0Z" fill="#6FD879" />
      <path d="M-20 0 H20 L15 34 H-15 Z" fill={C.coral} />
    </g>
  );
}

export function Mug({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="22" height="24" rx="5" fill={C.white} />
      <path d="M22 5 Q34 8 22 18" stroke={C.white} strokeWidth="4" fill="none" />
      <path
        d="M6 -6 Q9 -12 6 -18 M14 -6 Q17 -12 14 -18"
        stroke={C.skyDeep}
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

export function Spark({
  x,
  y,
  s = 1,
  color = C.sun,
}: {
  x: number;
  y: number;
  s?: number;
  color?: string;
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -12 C1 -4 4 -1 12 0 C4 1 1 4 0 12 C-1 4 -4 1 -12 0 C-4 -1 -1 -4 0 -12Z"
      fill={color}
    />
  );
}

function Backdrop({
  id,
  tint = C.sky,
  accent = C.mint,
}: {
  id: string;
  tint?: string;
  accent?: string;
}) {
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint} />
          <stop offset="1" stopColor={C.white} />
        </linearGradient>
      </defs>
      <circle cx="320" cy="250" r="226" fill={`url(#${id}-bg)`} />
      <circle cx="520" cy="130" r="74" fill={accent} />
      <circle cx="96" cy="410" r="52" fill={C.skyDeep} opacity=".55" />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard on a monitor                                                     */
/* -------------------------------------------------------------------------- */

const BARS = [34, 52, 44, 70, 62, 88, 76];

export function MiniDashboard({ animate = true }: { animate?: boolean }) {
  const reduce = useReducedMotion();
  const live = animate && !reduce;
  const gid = useId().replace(/:/g, '');
  return (
    <g>
      <defs>
        <linearGradient id={`${gid}-bar`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.cyan} />
          <stop offset="1" stopColor={C.blue} />
        </linearGradient>
        <linearGradient id={`${gid}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.green} stopOpacity=".35" />
          <stop offset="1" stopColor={C.green} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="320" height="190" rx="10" fill={C.white} />
      <rect width="320" height="22" rx="10" fill={C.cloud} />
      <circle cx="14" cy="11" r="3.5" fill={C.coral} />
      <circle cx="26" cy="11" r="3.5" fill={C.sun} />
      <circle cx="38" cy="11" r="3.5" fill={C.green} />
      <rect x="86" y="6" width="150" height="10" rx="5" fill={C.paper} />

      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${14 + i * 100} 32)`}>
          <rect width="92" height="42" rx="8" fill={[C.sky, C.mint, '#FFF3D6'][i]} />
          <rect x="9" y="9" width="34" height="5" rx="2.5" fill={C.navy} opacity=".35" />
          <rect x="9" y="21" width="52" height="11" rx="3" fill={C.navy} />
        </g>
      ))}

      <g transform="translate(14 84)">
        <rect width="170" height="94" rx="8" fill={C.cloud} />
        {BARS.map((h, i) => (
          <rect
            key={i}
            className={live ? 'landing-bar' : undefined}
            x={14 + i * 22}
            y={82 - h}
            width="13"
            height={h}
            rx="3"
            fill={`url(#${gid}-bar)`}
            style={{ animationDelay: `${0.5 + i * 0.07}s` }}
          />
        ))}
      </g>

      <g transform="translate(192 84)">
        <rect width="114" height="94" rx="8" fill={C.cloud} />
        <path d="M10 70 L34 52 L56 60 L80 30 L104 22 V84 H10Z" fill={`url(#${gid}-area)`} />
        <motion.path
          d="M10 70 L34 52 L56 60 L80 30 L104 22"
          fill="none"
          stroke={C.green}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={live ? { pathLength: 0 } : false}
          animate={{ pathLength: 1 }}
          transition={{ delay: 0.9, duration: 1.1, ease: 'easeInOut' }}
        />
        <circle cx="104" cy="22" r="5" fill={C.white} stroke={C.green} strokeWidth="3" />
      </g>
    </g>
  );
}

function Monitor({
  x,
  y,
  w = 340,
  children,
}: {
  x: number;
  y: number;
  w?: number;
  children: ReactNode;
}) {
  const h = (w * 190) / 320 + 24;
  const k = (w - 20) / 320;
  const mid = x + w / 2;
  return (
    <g>
      <rect x={mid - 15} y={y + h - 2} width="30" height="46" fill={C.navySoft} />
      <rect x={mid - 52} y={y + h + 40} width="104" height="9" rx="4.5" fill={C.navy} />
      <rect x={x} y={y} width={w} height={h} rx="14" fill={C.navy} />
      <g transform={`translate(${x + 10} ${y + 10}) scale(${k})`}>{children}</g>
    </g>
  );
}

function Desk({
  y = 345,
  x1 = 30,
  x2 = 610,
  floor = 440,
}: {
  y?: number;
  x1?: number;
  x2?: number;
  floor?: number;
}) {
  return (
    <g>
      <rect x={x1 + 40} y={y} width="14" height={floor - y} fill={C.navySoft} />
      <rect x={x2 - 54} y={y} width="14" height={floor - y} fill={C.navySoft} />
      <rect x={x1} y={y} width={x2 - x1} height="26" rx="8" fill={C.navy} />
      <rect x={x1} y={y} width={x2 - x1} height="8" rx="4" fill={C.blueDark} opacity=".6" />
    </g>
  );
}

/* -------------------------------------------------------------------------- */
/*  Scenes                                                                     */
/* -------------------------------------------------------------------------- */

interface SceneProps {
  readonly className?: string;
  readonly title: string;
}

/** Hero: analyst at a desk with a very large dashboard monitor. */
export function HeroScene({ className, title }: SceneProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 640 450" role="img" aria-label={title}>
      <Backdrop id={id} />
      <Spark x={70} y={110} s={1.1} />
      <Spark x={585} y={300} s={0.8} color={C.cyan} />
      <Spark x={310} y={50} s={0.7} color={C.green} />

      <rect x="92" y="205" width="118" height="150" rx="40" fill={C.blue} />
      <Person
        x={151}
        y={236}
        skin={SKIN[2]}
        hair={HAIR[0]}
        hairStyle="afro"
        top={C.green}
        torsoLength={104}
        leftArm={[
          [-38, 18],
          [-60, 66],
          [-30, 104],
        ]}
        rightArm={[
          [38, 18],
          [84, -2],
          [122, -34],
        ]}
      />

      <Monitor x={250} y={92} w={350}>
        <MiniDashboard />
      </Monitor>

      <Desk />
      <rect x="318" y="338" width="130" height="8" rx="4" fill={C.paper} />
      <Mug x={205} y={320} />
      <Plant x={60} y={345} s={0.9} />
      <ellipse cx="320" cy="442" rx="270" ry="8" fill={C.navy} opacity=".08" />
    </svg>
  );
}

/** Problem: someone buried in spreadsheets, waiting on a report. */
export function WaitingScene({ className, title }: SceneProps) {
  const id = useId().replace(/:/g, '');
  const rows = [0, 1, 2, 3, 4, 5];
  return (
    <svg className={className} viewBox="0 0 520 400" role="img" aria-label={title}>
      <Backdrop id={id} tint="#FFF1E6" accent="#FFE3D6" />
      <g transform="translate(46 0)">
        <rect
          x="258"
          y="52"
          width="148"
          height="104"
          rx="12"
          fill={C.white}
          stroke={C.skyDeep}
          strokeWidth="3"
        />
        <circle cx="332" cy="104" r="34" fill={C.cloud} stroke={C.navy} strokeWidth="5" />
        <path
          d="M332 82 V104 L348 114"
          stroke={C.coral}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      <rect x="60" y="150" width="260" height="170" rx="12" fill={C.navy} />
      <rect x="70" y="160" width="240" height="150" rx="6" fill={C.white} />
      {rows.map((r) => (
        <g key={r}>
          <rect x="70" y={160 + r * 25} width="240" height="1.5" fill={C.skyDeep} />
        </g>
      ))}
      {[0, 1, 2, 3, 4].map((c) => (
        <rect key={c} x={70 + c * 48} y="160" width="1.5" height="150" fill={C.skyDeep} />
      ))}
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect
            key={`${r}-${c}`}
            x={78 + c * 48}
            y={170 + r * 25}
            width={20 + ((r * 7 + c * 5) % 18)}
            height="7"
            rx="3.5"
            fill={r === 0 ? C.blue : C.skyDeep}
          />
        )),
      )}
      <rect x="170" y="318" width="40" height="30" fill={C.navySoft} />
      <rect x="140" y="344" width="100" height="8" rx="4" fill={C.navy} />

      <rect x="372" y="170" width="86" height="190" rx="43" fill={C.coral} opacity=".0" />
      <Person
        x={398}
        y={200}
        skin={SKIN[0]}
        hair={HAIR[1]}
        hairStyle="short"
        top={C.coral}
        glasses
        mood="worry"
        leftArm={[
          [-38, 18],
          [-66, 54],
          [-36, -30],
        ]}
        rightArm={[
          [38, 18],
          [52, 70],
          [30, 120],
        ]}
      />

      <g transform="translate(0 0)">
        <rect
          x="20"
          y="332"
          width="130"
          height="14"
          rx="3"
          fill={C.white}
          stroke={C.skyDeep}
          strokeWidth="2"
        />
        <rect
          x="30"
          y="318"
          width="116"
          height="14"
          rx="3"
          fill={C.paper}
          stroke={C.skyDeep}
          strokeWidth="2"
        />
        <rect
          x="24"
          y="304"
          width="122"
          height="14"
          rx="3"
          fill={C.white}
          stroke={C.skyDeep}
          strokeWidth="2"
        />
      </g>

      <rect x="30" y="346" width="460" height="22" rx="8" fill={C.navy} />
      <g>
        <circle cx="440" cy="108" r="5" fill={C.coral} />
        <circle cx="456" cy="94" r="3.5" fill={C.coral} opacity=".7" />
        <circle cx="468" cy="82" r="2.5" fill={C.coral} opacity=".5" />
      </g>
    </svg>
  );
}

/** Spot illustration: connect data sources. */
export function ConnectSpot({ className, title }: SceneProps) {
  return (
    <svg className={className} viewBox="0 0 240 200" role="img" aria-label={title}>
      <circle cx="120" cy="104" r="86" fill={C.sky} />
      <g transform="translate(150 54)">
        <ellipse cx="32" cy="12" rx="32" ry="12" fill={C.blue} />
        <path
          d="M0 12 V70 C0 77 14 82 32 82 C50 82 64 77 64 70 V12 C64 19 50 24 32 24 C14 24 0 19 0 12Z"
          fill={C.blueDark}
        />
        <path
          d="M0 38 C0 45 14 50 32 50 C50 50 64 45 64 38"
          stroke={C.sky}
          strokeWidth="3"
          fill="none"
        />
        <path
          d="M0 58 C0 65 14 70 32 70 C50 70 64 65 64 58"
          stroke={C.sky}
          strokeWidth="3"
          fill="none"
        />
      </g>
      {[
        { y: 40, c: C.green, t: 'CSV' },
        { y: 92, c: C.cyan, t: 'XLS' },
      ].map((f) => (
        <g key={f.t} transform={`translate(22 ${f.y})`}>
          <path d="M0 0 H34 L46 12 V50 H0Z" fill={C.white} stroke={f.c} strokeWidth="3" />
          <rect x="8" y="26" width="30" height="14" rx="3" fill={f.c} />
          <text
            x="23"
            y="37"
            textAnchor="middle"
            fontSize="9"
            fontWeight="800"
            fill="#fff"
            fontFamily="inherit"
          >
            {f.t}
          </text>
        </g>
      ))}
      <path
        d="M72 68 C100 68 110 96 148 96 M72 118 C100 118 112 104 148 100"
        stroke={C.cyan}
        strokeWidth="3"
        strokeDasharray="2 7"
        strokeLinecap="round"
        fill="none"
      />
      <Person
        x={84}
        y={150}
        s={0.62}
        skin={SKIN[1]}
        hair={HAIR[3]}
        hairStyle="bun"
        top={C.navySoft}
        torsoLength={90}
        rightArm={[
          [38, 18],
          [74, 30],
          [104, 8],
        ]}
      />
      <Spark x={206} y={34} s={0.7} color={C.green} />
    </svg>
  );
}

/** Spot illustration: type a question. */
export function AskSpot({ className, title }: SceneProps) {
  return (
    <svg className={className} viewBox="0 0 240 200" role="img" aria-label={title}>
      <circle cx="120" cy="104" r="86" fill={C.mint} />
      <rect x="86" y="38" width="130" height="50" rx="14" fill={C.blue} />
      <path d="M104 88 L98 104 L122 88Z" fill={C.blue} />
      <rect x="100" y="52" width="86" height="7" rx="3.5" fill={C.white} />
      <rect x="100" y="68" width="56" height="7" rx="3.5" fill={C.white} opacity=".7" />
      <Spark x={198} y={52} s={0.55} color={C.sun} />
      <Person
        x={70}
        y={106}
        s={0.64}
        skin={SKIN[3]}
        hair={HAIR[0]}
        hairStyle="long"
        top={C.coral}
        torsoLength={86}
        leftArm={[
          [-38, 18],
          [-44, 56],
          [-10, 76],
        ]}
        rightArm={[
          [38, 18],
          [50, 58],
          [26, 80],
        ]}
      />
      <path d="M40 176 L50 138 H150 L160 176Z" fill={C.navy} />
      <rect x="30" y="174" width="140" height="8" rx="4" fill={C.navySoft} />
      <rect x="70" y="146" width="60" height="4" rx="2" fill={C.cyan} />
      <rect x="170" y="148" width="40" height="34" rx="6" fill={C.navySoft} opacity="0" />
    </svg>
  );
}

/** Spot illustration: decide together around a chart. */
export function DecideSpot({ className, title }: SceneProps) {
  return (
    <svg className={className} viewBox="0 0 240 200" role="img" aria-label={title}>
      <circle cx="120" cy="104" r="86" fill="#FFF3D6" />
      <rect
        x="64"
        y="28"
        width="116"
        height="84"
        rx="10"
        fill={C.white}
        stroke={C.navy}
        strokeWidth="3"
      />
      {[18, 30, 24, 46, 58].map((h, i) => (
        <rect
          key={i}
          x={78 + i * 20}
          y={98 - h}
          width="12"
          height={h}
          rx="3"
          fill={i === 4 ? C.green : C.blue}
        />
      ))}
      <path
        d="M78 66 L100 56 L120 62 L142 44 L164 36"
        stroke={C.coral}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="164" cy="36" r="9" fill={C.green} />
      <path
        d="M160 36 L163 39 L169 32"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Person
        x={64}
        y={150}
        s={0.56}
        skin={SKIN[0]}
        hair={HAIR[2]}
        hairStyle="bob"
        top={C.blue}
        torsoLength={60}
        rightArm={[
          [38, 18],
          [78, 4],
          [96, -28],
        ]}
      />
      <Person
        x={176}
        y={152}
        s={0.56}
        skin={SKIN[2]}
        hair={HAIR[0]}
        hairStyle="short"
        beard
        top={C.green}
        torsoLength={58}
        leftArm={[
          [-38, 18],
          [-72, 8],
          [-90, -22],
        ]}
      />
      <rect x="20" y="180" width="200" height="8" rx="4" fill={C.navy} opacity=".12" />
    </svg>
  );
}

/** Team scene: a group around one live dashboard. */
export function TeamScene({ className, title }: SceneProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 640 460" role="img" aria-label={title}>
      <Backdrop id={id} tint={C.mint} accent={C.sky} />
      <Spark x={74} y={96} s={0.9} color={C.cyan} />
      <Spark x={576} y={330} s={0.9} />

      <rect x="150" y="40" width="340" height="206" rx="16" fill={C.navy} />
      <g transform="translate(162 52) scale(1.0375)">
        <MiniDashboard animate={false} />
      </g>
      <rect x="300" y="246" width="40" height="22" fill={C.navySoft} />

      <Person
        x={100}
        y={282}
        s={1}
        skin={SKIN[1]}
        hair={HAIR[1]}
        hairStyle="long"
        top={C.blue}
        torsoLength={90}
        rightArm={[
          [38, 18],
          [80, 0],
          [118, -40],
        ]}
      />
      <Person
        x={250}
        y={296}
        s={0.95}
        skin={SKIN[0]}
        hair={HAIR[3]}
        hairStyle="short"
        top={C.coral}
        glasses
        torsoLength={90}
        leftArm={[
          [-38, 18],
          [-60, 60],
          [-30, 92],
        ]}
        rightArm={[
          [38, 18],
          [60, 58],
          [34, 90],
        ]}
      />
      <Person
        x={400}
        y={290}
        s={1}
        skin={SKIN[3]}
        hair={HAIR[0]}
        hairStyle="afro"
        top={C.green}
        torsoLength={90}
        leftArm={[
          [-38, 18],
          [-60, 62],
          [-34, 94],
        ]}
        rightArm={[
          [38, 18],
          [58, 58],
          [30, 90],
        ]}
      />
      <Person
        x={548}
        y={284}
        s={1}
        skin={SKIN[2]}
        hair={HAIR[2]}
        hairStyle="bun"
        top={C.navySoft}
        torsoLength={90}
        leftArm={[
          [-38, 18],
          [-86, 0],
          [-120, -38],
        ]}
      />

      <rect x="40" y="372" width="560" height="26" rx="10" fill={C.navy} />
      <rect x="40" y="372" width="560" height="8" rx="4" fill={C.blueDark} opacity=".6" />
      <Mug x={150} y={348} />
      <rect x="440" y="360" width="64" height="12" rx="3" fill={C.white} />
      <Plant x={580} y={372} s={0.8} />
    </svg>
  );
}

/** Round avatar for use cases. */
export function Avatar({
  skin,
  hair,
  hairStyle,
  top,
  bg,
  glasses,
  beard,
}: {
  skin: number;
  hair: number;
  hairStyle: HairStyle;
  top: string;
  bg: string;
  glasses?: boolean;
  beard?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <defs>
        <clipPath id={`${id}-c`}>
          <circle cx="60" cy="60" r="60" />
        </clipPath>
      </defs>
      <circle cx="60" cy="60" r="60" fill={bg} />
      <g clipPath={`url(#${id}-c)`}>
        <Person
          x={60}
          y={92}
          s={1.02}
          skin={SKIN[skin]}
          hair={HAIR[hair]}
          hairStyle={hairStyle}
          top={top}
          glasses={glasses}
          beard={beard}
          torsoLength={90}
          leftArm={[
            [-38, 18],
            [-46, 50],
            [-40, 80],
          ]}
          rightArm={[
            [38, 18],
            [46, 50],
            [40, 80],
          ]}
        />
      </g>
    </svg>
  );
}
