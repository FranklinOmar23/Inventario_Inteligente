import React, { useId } from 'react';

export default function Shelf3DIcon({ size = 48, animated = true, delay = 0, className = '' }) {
  const uid = useId().replace(/:/g, '');

  const floatDist = Math.round(size * 0.12);

  return (
    <>
      <style>{`
        @keyframes sf-float-${uid} {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-${floatDist}px); }
        }
        @keyframes sf-shadow-${uid} {
          0%, 100% { opacity: 0.18; transform: scaleX(1); }
          50%       { opacity: 0.07; transform: scaleX(0.6); }
        }
        @keyframes sf-shine-${uid} {
          0%, 100% { opacity: 0.12; }
          50%       { opacity: 0.28; }
        }
        .sf-body-${uid}   { animation: ${animated ? `sf-float-${uid} 3.4s ease-in-out ${delay}s infinite` : 'none'}; }
        .sf-shadow-${uid} {
          transform-origin: center;
          animation: ${animated ? `sf-shadow-${uid} 3.4s ease-in-out ${delay}s infinite` : 'none'};
        }
        .sf-shine-${uid}  { animation: ${animated ? `sf-shine-${uid} 3.4s ease-in-out ${delay}s infinite` : 'none'}; }
      `}</style>

      <svg
        width={size}
        height={Math.round(size * 1.25)}
        viewBox="0 0 96 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* ── shadow ───────────────────────────────────────── */}
        <ellipse
          cx="46" cy="116" rx="26" ry="4"
          fill="rgba(0,0,0,0.22)"
          className={`sf-shadow-${uid}`}
        />

        <g className={`sf-body-${uid}`}>
          {/* ── right side face (darkest) ────────────────── */}
          <polygon
            points="70,24 94,11 94,98 70,111"
            fill="#4c1d95"
          />
          {/* shelf lines — right side */}
          <line x1="70" y1="46" x2="94" y2="33" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="70" y1="68" x2="94" y2="55" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="70" y1="90" x2="94" y2="77" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>

          {/* ── front face (primary) ──────────────────────── */}
          <rect x="6" y="24" width="64" height="87" rx="3" fill="#6d28d9"/>

          {/* shelf dividers — front */}
          <line x1="6" y1="46" x2="70" y2="46" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="6" y1="68" x2="70" y2="68" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="6" y1="90" x2="70" y2="90" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>

          {/* ── items on shelves ──────────────────────────── */}
          {/* row 1: y 24→46 */}
          <rect x="11" y="29" width="9"  height="15" rx="2" fill="rgba(255,255,255,0.72)"/>
          <rect x="23" y="32" width="7"  height="12" rx="2" fill="rgba(196,181,253,0.65)"/>
          <rect x="33" y="28" width="11" height="16" rx="2" fill="rgba(255,255,255,0.58)"/>
          <rect x="47" y="31" width="7"  height="13" rx="2" fill="rgba(196,181,253,0.50)"/>
          <rect x="57" y="30" width="8"  height="14" rx="2" fill="rgba(255,255,255,0.45)"/>

          {/* row 2: y 46→68 */}
          <rect x="11" y="51" width="13" height="15" rx="2" fill="rgba(255,255,255,0.60)"/>
          <rect x="27" y="53" width="9"  height="13" rx="2" fill="rgba(196,181,253,0.70)"/>
          <rect x="39" y="50" width="7"  height="16" rx="2" fill="rgba(255,255,255,0.50)"/>
          <rect x="49" y="52" width="11" height="14" rx="2" fill="rgba(196,181,253,0.42)"/>

          {/* row 3: y 68→90 */}
          <rect x="11" y="73" width="8"  height="15" rx="2" fill="rgba(255,255,255,0.65)"/>
          <rect x="22" y="75" width="11" height="13" rx="2" fill="rgba(196,181,253,0.58)"/>
          <rect x="36" y="72" width="6"  height="16" rx="2" fill="rgba(255,255,255,0.70)"/>
          <rect x="45" y="74" width="12" height="14" rx="2" fill="rgba(196,181,253,0.45)"/>
          <rect x="60" y="73" width="6"  height="15" rx="2" fill="rgba(255,255,255,0.40)"/>

          {/* row 4: y 90→111 */}
          <rect x="11" y="95" width="11" height="13" rx="2" fill="rgba(255,255,255,0.60)"/>
          <rect x="25" y="97" width="8"  height="11" rx="2" fill="rgba(196,181,253,0.55)"/>
          <rect x="36" y="94" width="14" height="14" rx="2" fill="rgba(255,255,255,0.50)"/>
          <rect x="53" y="96" width="9"  height="12" rx="2" fill="rgba(196,181,253,0.42)"/>

          {/* ── top face (lightest) ───────────────────────── */}
          <polygon
            points="6,24 70,24 94,11 30,11"
            fill="#7c3aed"
          />
          {/* shine sweep on top */}
          <polygon
            points="6,24 38,24 62,11 30,11"
            fill="rgba(255,255,255,1)"
            className={`sf-shine-${uid}`}
          />
          {/* top edge lines */}
          <line x1="6"  y1="24" x2="70" y2="24" stroke="rgba(255,255,255,0.30)" strokeWidth="1"/>
          <line x1="30" y1="11" x2="94" y2="11" stroke="rgba(255,255,255,0.20)" strokeWidth="1"/>
        </g>
      </svg>
    </>
  );
}
