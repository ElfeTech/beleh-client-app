import { useId } from 'react';
import { LandingPlatformEmulator } from './LandingPlatformEmulator';
import { Avatar, C, Mug, Person, Plant, Spark } from './illustrations';

/* ------------------------------------------------------------------ */
/*  Ask in natural language: person at a desk, demo plays on the laptop */
/* ------------------------------------------------------------------ */

export function LaptopScene() {
  return (
    <div className="fa-laptop">
      <svg
        className="fa-laptop__svg"
        viewBox="0 0 640 380"
        role="img"
        aria-label="A person at a desk beside a laptop that is running the Beleh workspace"
      >
        <circle cx="340" cy="190" r="196" fill="#fff" opacity=".1" />
        <circle cx="560" cy="60" r="44" fill="#fff" opacity=".1" />
        <Spark x={52} y={78} s={1} color={C.sun} />
        <Spark x={612} y={150} s={0.8} color="#fff" />
        <Spark x={300} y={14} s={0.6} color={C.green} />

        <g className="fa-bob">
          <rect x="18" y="38" width="124" height="46" rx="16" fill="#fff" />
          <path d="M44 84 L38 100 L62 84Z" fill="#fff" />
          <rect x="32" y="52" width="86" height="7" rx="3.5" fill={C.blue} />
          <rect x="32" y="66" width="54" height="7" rx="3.5" fill={C.skyDeep} />
        </g>

        <rect x="24" y="176" width="116" height="170" rx="44" fill={C.cyan} />
        <Person
          x={82}
          y={200}
          skin="#B07548"
          hair="#1B1B2F"
          hairStyle="afro"
          top={C.green}
          torsoLength={140}
          leftArm={[
            [-38, 18],
            [-58, 70],
            [-30, 128],
          ]}
          rightArm={[
            [38, 18],
            [66, 36],
            [84, 56],
          ]}
        />

        <rect x="150" y="28" width="440" height="290" rx="18" fill={C.navy} />
        <rect x="124" y="318" width="492" height="18" rx="9" fill={C.navySoft} />
        <rect x="326" y="318" width="80" height="6" rx="3" fill={C.navy} />
        <circle cx="370" cy="37" r="2.5" fill={C.navySoft} />

        <rect x="14" y="336" width="612" height="30" rx="10" fill={C.navy} />
        <rect x="14" y="336" width="612" height="8" rx="4" fill={C.blueDark} opacity=".7" />
        <Mug x={92} y={312} />
        <Plant x={612} y={336} s={0.78} />
      </svg>
      <div className="fa-laptop__screen">
        <LandingPlatformEmulator />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Spot illustrations for the smaller cards (viewBox 240 x 150)        */
/* ------------------------------------------------------------------ */

export function ChartsArt() {
  return (
    <svg
      className="fa-art"
      viewBox="0 0 240 150"
      role="img"
      aria-label="Bar, donut and line chart cards"
    >
      <circle cx="120" cy="78" r="66" fill="#fff" opacity=".7" />
      <g className="fa-bob">
        <rect x="14" y="44" width="104" height="88" rx="14" fill="#fff" />
        {[34, 52, 40, 64, 48].map((h, i) => (
          <rect
            key={i}
            x={28 + i * 18}
            y={118 - h}
            width="11"
            height={h}
            rx="3.5"
            fill={i === 3 ? C.green : i % 2 ? C.cyan : C.blue}
          />
        ))}
      </g>
      <g className="fa-bob fa-bob--b">
        <rect x="124" y="14" width="86" height="76" rx="14" fill="#fff" />
        <g transform="rotate(-90 167 52)" fill="none" strokeWidth="13" pathLength={100}>
          <circle cx="167" cy="52" r="19" stroke={C.sky} />
          <circle
            cx="167"
            cy="52"
            r="19"
            stroke={C.blue}
            pathLength={100}
            strokeDasharray="55 100"
          />
          <circle
            cx="167"
            cy="52"
            r="19"
            stroke={C.green}
            pathLength={100}
            strokeDasharray="25 100"
            strokeDashoffset="-55"
          />
        </g>
      </g>
      <g className="fa-bob fa-bob--c">
        <rect x="138" y="96" width="90" height="50" rx="14" fill="#fff" />
        <path
          d="M150 134 L168 118 L184 124 L204 108 L218 104"
          fill="none"
          stroke={C.green}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="218" cy="104" r="5" fill="#fff" stroke={C.green} strokeWidth="3" />
      </g>
      <Spark x={30} y={26} s={0.7} color={C.sun} />
    </svg>
  );
}

export function ConnectArt() {
  return (
    <svg
      className="fa-art"
      viewBox="0 0 240 150"
      role="img"
      aria-label="Files and a spreadsheet plugged into a database"
    >
      <circle cx="120" cy="78" r="66" fill="#fff" opacity=".6" />
      <path
        className="fa-flow"
        d="M62 44 C 92 44, 92 66, 104 70"
        fill="none"
        stroke={C.green}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        className="fa-flow"
        d="M62 108 C 92 108, 92 90, 104 84"
        fill="none"
        stroke={C.cyan}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        className="fa-flow"
        d="M178 76 C 160 76, 150 78, 140 78"
        fill="none"
        stroke={C.blue}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <g transform="translate(94 38)">
        <ellipse cx="26" cy="12" rx="26" ry="10" fill={C.blue} />
        <path
          d="M0 12 V62 C0 68 12 72 26 72 C40 72 52 68 52 62 V12 C52 18 40 22 26 22 C12 22 0 18 0 12Z"
          fill={C.blueDark}
        />
        <path
          d="M0 34 C0 40 12 44 26 44 C40 44 52 40 52 34 M0 52 C0 58 12 62 26 62 C40 62 52 58 52 52"
          stroke={C.sky}
          strokeWidth="3"
          fill="none"
        />
      </g>
      <g transform="translate(14 22)">
        <path d="M0 0 H30 L40 10 V44 H0Z" fill="#fff" stroke={C.green} strokeWidth="3" />
        <rect x="6" y="24" width="28" height="13" rx="3" fill={C.green} />
        <text x="20" y="34" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff">
          CSV
        </text>
      </g>
      <g transform="translate(14 88)">
        <path d="M0 0 H30 L40 10 V44 H0Z" fill="#fff" stroke={C.cyan} strokeWidth="3" />
        <rect x="6" y="24" width="28" height="13" rx="3" fill={C.cyan} />
        <text x="20" y="34" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff">
          XLS
        </text>
      </g>
      <g transform="translate(176 52)">
        <rect width="52" height="46" rx="10" fill="#fff" stroke={C.blue} strokeWidth="3" />
        <path d="M0 16 H52 M0 30 H52 M18 0 V46 M35 0 V46" stroke={C.skyDeep} strokeWidth="2.5" />
        <rect x="2" y="2" width="14" height="12" rx="2" fill={C.sky} />
      </g>
      <Spark x={214} y={26} s={0.6} color={C.green} />
    </svg>
  );
}

export function OverviewArt() {
  const id = useId().replace(/:/g, '');
  return (
    <svg
      className="fa-art"
      viewBox="0 0 240 150"
      role="img"
      aria-label="A dashboard that fills itself in on day one"
    >
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.cyan} />
          <stop offset="1" stopColor={C.blue} />
        </linearGradient>
      </defs>
      <circle cx="120" cy="78" r="66" fill="#fff" opacity=".6" />
      <rect x="28" y="20" width="184" height="116" rx="14" fill="#fff" />
      <rect x="28" y="20" width="184" height="22" rx="14" fill={C.navy} />
      <rect x="28" y="32" width="184" height="10" fill={C.navy} />
      <circle cx="42" cy="31" r="3.5" fill={C.coral} />
      <circle cx="54" cy="31" r="3.5" fill={C.sun} />
      <circle cx="66" cy="31" r="3.5" fill={C.green} />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${40 + i * 56} 52)`}>
          <g className="fa-pop" style={{ animationDelay: `${i * 0.25}s` }}>
            <rect width="48" height="26" rx="7" fill={[C.sky, C.mint, '#FFF3D6'][i]} />
            <rect x="7" y="7" width="20" height="4" rx="2" fill={C.navy} opacity=".35" />
            <rect x="7" y="15" width="30" height="6" rx="3" fill={C.navy} />
          </g>
        </g>
      ))}
      {[14, 24, 18, 32, 26, 36].map((h, i) => (
        <rect
          key={i}
          className="fa-rise"
          x={42 + i * 15}
          y={126 - h}
          width="9"
          height={h}
          rx="3"
          fill={`url(#${id}-b)`}
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
      <path
        className="fa-draw"
        pathLength={1}
        d="M140 122 L156 110 L170 115 L196 96"
        fill="none"
        stroke={C.green}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="fa-bob">
        <rect x="150" y="6" width="62" height="24" rx="12" fill={C.green} />
        <text x="181" y="22" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">
          Day 1
        </text>
      </g>
      <Spark x={26} y={22} s={0.7} color={C.sun} />
    </svg>
  );
}

export function TeamArt() {
  return (
    <div className="fa-team" role="img" aria-label="Teammates sharing one workspace">
      <svg viewBox="0 0 240 150" aria-hidden>
        <circle cx="120" cy="78" r="66" fill="#fff" opacity=".8" />
        <path
          className="fa-flow"
          d="M60 52 L106 76 M180 52 L134 76 M120 112 L120 92"
          stroke={C.blue}
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        <g transform="translate(92 52)">
          <rect width="56" height="40" rx="10" fill={C.navy} />
          <rect x="8" y="8" width="40" height="24" rx="5" fill="#fff" />
          {[8, 14, 10, 18].map((h, i) => (
            <rect
              key={i}
              x={13 + i * 9}
              y={28 - h}
              width="6"
              height={h}
              rx="2"
              fill={i === 3 ? C.green : C.blue}
            />
          ))}
        </g>
      </svg>
      <span className="fa-team__a fa-bob">
        <Avatar skin={1} hair={0} hairStyle="short" top={C.blue} bg={C.sky} beard />
      </span>
      <span className="fa-team__b fa-bob fa-bob--b">
        <Avatar skin={3} hair={0} hairStyle="afro" top={C.green} bg={C.mint} />
      </span>
      <span className="fa-team__c fa-bob fa-bob--c">
        <Avatar skin={0} hair={2} hairStyle="bob" top={C.coral} bg="#FFE3D6" glasses />
      </span>
    </div>
  );
}

export function PrivacyArt() {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="fa-privacy" viewBox="0 0 150 150" role="img" aria-label="A shield with a lock">
      <defs>
        <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.blue} />
          <stop offset="0.55" stopColor={C.cyan} />
          <stop offset="1" stopColor={C.green} />
        </linearGradient>
      </defs>
      <circle
        className="fa-orbit"
        cx="75"
        cy="75"
        r="68"
        fill="none"
        stroke={C.skyDeep}
        strokeWidth="2.5"
        strokeDasharray="3 8"
        strokeLinecap="round"
      />
      <circle cx="75" cy="75" r="56" fill="#fff" opacity=".7" />
      <path
        d="M75 20 L116 35 V74 C116 102 98 120 75 130 C52 120 34 102 34 74 V35 Z"
        fill={`url(#${id}-s)`}
      />
      <path d="M75 28 L108 40 V74 C108 96 94 112 75 121 V28Z" fill="#fff" opacity=".14" />
      <rect x="56" y="70" width="38" height="30" rx="8" fill="#fff" />
      <path
        d="M63 70 V62 C63 54 69 50 75 50 C81 50 87 54 87 62 V70"
        fill="none"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <circle cx="75" cy="83" r="5" fill={C.blue} />
      <rect x="73" y="85" width="4" height="9" rx="2" fill={C.blue} />
      <Spark x={126} y={26} s={0.6} color={C.sun} />
      <Spark x={22} y={112} s={0.5} color={C.green} />
    </svg>
  );
}
