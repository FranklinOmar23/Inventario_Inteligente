import React, { useId } from 'react';

// ── Type registry ────────────────────────────────────────────────────────────
export const CONTAINER_TYPES = [
  { value: 'estante',   label: 'Estante',   desc: 'Estante abierto con niveles' },
  { value: 'armario',   label: 'Armario',   desc: 'Mueble cerrado con puertas' },
  { value: 'remesa',    label: 'Remesa',    desc: 'Caja o contenedor de carga' },
  { value: 'libreria',  label: 'Librería',  desc: 'Estantería para libros y documentos' },
  { value: 'esquinero', label: 'Esquinero', desc: 'Mueble para rincón o esquina' },
  { value: 'vitrina',   label: 'Vitrina',   desc: 'Mueble con frente de vidrio' },
  { value: 'rack',      label: 'Rack IT',   desc: 'Rack para equipos tecnológicos' },
  { value: 'cajon',     label: 'Cajones',   desc: 'Unidad de gavetas' },
];

// ── Base isometric coordinates (viewBox 0 0 96 120) ─────────────────────────
// Front face : x=6 y=24 → x=70 y=111  (w=64, h=87)
// Right face : 70,24 → 94,11 → 94,98 → 70,111
// Top face   : 6,24 → 70,24 → 94,11 → 30,11
// Shelf y on front : 46, 68, 90  |  on right : 33, 55, 77

// ── SVG type bodies ──────────────────────────────────────────────────────────

function Estante() {
  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#4c1d95"/>
      <line x1="70" y1="46" x2="94" y2="33" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="70" y1="68" x2="94" y2="55" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="70" y1="90" x2="94" y2="77" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>

      <rect x="6" y="24" width="64" height="87" rx="3" fill="#6d28d9"/>
      <line x1="6" y1="46" x2="70" y2="46" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="68" x2="70" y2="68" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="90" x2="70" y2="90" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>

      <rect x="11" y="29" width="9"  height="15" rx="2" fill="rgba(255,255,255,0.72)"/>
      <rect x="23" y="32" width="7"  height="12" rx="2" fill="rgba(196,181,253,0.65)"/>
      <rect x="33" y="28" width="11" height="16" rx="2" fill="rgba(255,255,255,0.58)"/>
      <rect x="47" y="31" width="7"  height="13" rx="2" fill="rgba(196,181,253,0.50)"/>
      <rect x="57" y="30" width="8"  height="14" rx="2" fill="rgba(255,255,255,0.45)"/>

      <rect x="11" y="51" width="13" height="15" rx="2" fill="rgba(255,255,255,0.60)"/>
      <rect x="27" y="53" width="9"  height="13" rx="2" fill="rgba(196,181,253,0.70)"/>
      <rect x="39" y="50" width="7"  height="16" rx="2" fill="rgba(255,255,255,0.50)"/>
      <rect x="49" y="52" width="11" height="14" rx="2" fill="rgba(196,181,253,0.42)"/>

      <rect x="11" y="73" width="8"  height="15" rx="2" fill="rgba(255,255,255,0.65)"/>
      <rect x="22" y="75" width="11" height="13" rx="2" fill="rgba(196,181,253,0.58)"/>
      <rect x="36" y="72" width="6"  height="16" rx="2" fill="rgba(255,255,255,0.70)"/>
      <rect x="45" y="74" width="12" height="14" rx="2" fill="rgba(196,181,253,0.45)"/>
      <rect x="60" y="73" width="6"  height="15" rx="2" fill="rgba(255,255,255,0.40)"/>

      <rect x="11" y="95" width="11" height="13" rx="2" fill="rgba(255,255,255,0.60)"/>
      <rect x="25" y="97" width="8"  height="11" rx="2" fill="rgba(196,181,253,0.55)"/>
      <rect x="36" y="94" width="14" height="14" rx="2" fill="rgba(255,255,255,0.50)"/>
      <rect x="53" y="96" width="9"  height="12" rx="2" fill="rgba(196,181,253,0.42)"/>

      <polygon points="6,24 70,24 94,11 30,11" fill="#7c3aed"/>
    </>
  );
}

function Armario() {
  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#1e3a8a"/>
      <rect x="6" y="24" width="64" height="87" rx="3" fill="#1e40af"/>

      {/* Left door */}
      <rect x="9"  y="27" width="27" height="81" rx="2" fill="#2563eb" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      {/* Right door */}
      <rect x="39" y="27" width="27" height="81" rx="2" fill="#2563eb" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5"/>
      {/* Center gap */}
      <rect x="36" y="27" width="3" height="81" fill="#1e3a8a"/>

      {/* Door decorative inset panels */}
      <rect x="12" y="30" width="21" height="14" rx="1.5" fill="rgba(255,255,255,0.08)"/>
      <rect x="12" y="48" width="21" height="28" rx="1.5" fill="rgba(255,255,255,0.08)"/>
      <rect x="12" y="80" width="21" height="25" rx="1.5" fill="rgba(255,255,255,0.08)"/>

      <rect x="42" y="30" width="21" height="14" rx="1.5" fill="rgba(255,255,255,0.08)"/>
      <rect x="42" y="48" width="21" height="28" rx="1.5" fill="rgba(255,255,255,0.08)"/>
      <rect x="42" y="80" width="21" height="25" rx="1.5" fill="rgba(255,255,255,0.08)"/>

      {/* Hinges */}
      <rect x="9"  y="32"  width="3" height="6" rx="1" fill="rgba(255,255,255,0.35)"/>
      <rect x="9"  y="76"  width="3" height="6" rx="1" fill="rgba(255,255,255,0.35)"/>
      <rect x="9"  y="100" width="3" height="6" rx="1" fill="rgba(255,255,255,0.35)"/>
      <rect x="39" y="32"  width="3" height="6" rx="1" fill="rgba(255,255,255,0.35)"/>
      <rect x="39" y="76"  width="3" height="6" rx="1" fill="rgba(255,255,255,0.35)"/>
      <rect x="39" y="100" width="3" height="6" rx="1" fill="rgba(255,255,255,0.35)"/>

      {/* Knobs */}
      <circle cx="34" cy="67" r="3" fill="rgba(255,255,255,0.80)"/>
      <circle cx="40" cy="67" r="3" fill="rgba(255,255,255,0.80)"/>

      <polygon points="6,24 70,24 94,11 30,11" fill="#3b82f6"/>
    </>
  );
}

function Remesa() {
  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#78350f"/>
      {/* Right side planks */}
      <line x1="70" y1="40" x2="94" y2="27" stroke="rgba(0,0,0,0.22)" strokeWidth="2"/>
      <line x1="70" y1="56" x2="94" y2="43" stroke="rgba(0,0,0,0.22)" strokeWidth="2"/>
      <line x1="70" y1="72" x2="94" y2="59" stroke="rgba(0,0,0,0.22)" strokeWidth="2"/>
      <line x1="70" y1="88" x2="94" y2="75" stroke="rgba(0,0,0,0.22)" strokeWidth="2"/>

      <rect x="6" y="24" width="64" height="87" rx="2" fill="#92400e"/>

      {/* Horizontal planks */}
      <line x1="6" y1="40" x2="70" y2="40" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="6" y1="56" x2="70" y2="56" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="6" y1="72" x2="70" y2="72" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="6" y1="88" x2="70" y2="88" stroke="rgba(0,0,0,0.28)" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Diagonal X brace */}
      <line x1="6"  y1="24" x2="70" y2="111" stroke="rgba(0,0,0,0.18)" strokeWidth="2"/>
      <line x1="70" y1="24" x2="6"  y2="111" stroke="rgba(0,0,0,0.18)" strokeWidth="2"/>

      {/* Vertical grain */}
      <line x1="22" y1="24" x2="22" y2="111" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <line x1="38" y1="24" x2="38" y2="111" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>
      <line x1="54" y1="24" x2="54" y2="111" stroke="rgba(255,255,255,0.07)" strokeWidth="1"/>

      {/* Metal corner brackets */}
      <rect x="5"   y="23"  width="9" height="5" rx="1" fill="#d97706"/>
      <rect x="62"  y="23"  width="9" height="5" rx="1" fill="#d97706"/>
      <rect x="5"   y="108" width="9" height="5" rx="1" fill="#d97706"/>
      <rect x="62"  y="108" width="9" height="5" rx="1" fill="#d97706"/>

      {/* Rope handle */}
      <path d="M26 68 Q38 58 50 68" stroke="rgba(255,220,140,0.75)" strokeWidth="3.5" fill="none" strokeLinecap="round"/>

      <polygon points="6,24 70,24 94,11 30,11" fill="#b45309"/>
      {/* Top wood planks */}
      <line x1="20" y1="22" x2="44" y2="9"  stroke="rgba(0,0,0,0.20)" strokeWidth="1.5"/>
      <line x1="38" y1="22" x2="62" y2="9"  stroke="rgba(0,0,0,0.20)" strokeWidth="1.5"/>
      <line x1="56" y1="22" x2="80" y2="9"  stroke="rgba(0,0,0,0.20)" strokeWidth="1.5"/>
    </>
  );
}

function Libreria() {
  const row = (yTop, books) => books.map(([x, w, c, h = 16], i) => (
    <rect key={i} x={x} y={yTop + (18 - h)} width={w} height={h} rx="1" fill={c} opacity="0.88"/>
  ));

  const r1 = [[9,5,'#ef4444'],[15,4,'#f97316',14],[20,6,'#eab308'],[27,4,'#22c55e',14],[32,5,'#06b6d4'],[38,4,'#8b5cf6',14],[43,6,'#ec4899'],[50,4,'#f59e0b',14],[55,5,'#10b981'],[61,5,'#6366f1',14]];
  const r2 = [[9,4,'#a855f7',14],[14,6,'#ef4444'],[21,4,'#14b8a6',14],[26,5,'#f43f5e'],[32,4,'#84cc16',14],[37,6,'#0ea5e9'],[44,4,'#f97316',14],[49,5,'#8b5cf6'],[55,4,'#22c55e',14],[60,6,'#ec4899']];
  const r3 = [[9,6,'#eab308'],[16,4,'#06b6d4',14],[21,5,'#ef4444'],[27,4,'#a855f7',14],[32,6,'#f59e0b'],[39,4,'#10b981',14],[44,5,'#6366f1'],[50,4,'#f97316',14],[55,6,'#14b8a6'],[62,4,'#f43f5e',14]];
  const r4 = [[9,5,'#84cc16'],[15,4,'#0ea5e9',14],[20,6,'#ec4899'],[27,4,'#ef4444',14],[32,5,'#8b5cf6'],[38,4,'#22c55e',14],[43,6,'#f97316'],[50,4,'#a855f7',14],[55,5,'#06b6d4'],[61,5,'#eab308',14]];

  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#064e3b"/>
      <line x1="70" y1="46" x2="94" y2="33" stroke="rgba(0,0,0,0.35)" strokeWidth="2"/>
      <line x1="70" y1="68" x2="94" y2="55" stroke="rgba(0,0,0,0.35)" strokeWidth="2"/>
      <line x1="70" y1="90" x2="94" y2="77" stroke="rgba(0,0,0,0.35)" strokeWidth="2"/>

      <rect x="6" y="24" width="64" height="87" rx="3" fill="#065f46"/>

      {/* Shelf boards */}
      <rect x="6" y="44" width="64" height="4" rx="1" fill="#064e3b" opacity="0.6"/>
      <rect x="6" y="66" width="64" height="4" rx="1" fill="#064e3b" opacity="0.6"/>
      <rect x="6" y="88" width="64" height="4" rx="1" fill="#064e3b" opacity="0.6"/>

      {/* Books */}
      {row(26, r1)}
      {row(48, r2)}
      {row(70, r3)}
      {row(92, r4)}

      <polygon points="6,24 70,24 94,11 30,11" fill="#047857"/>
    </>
  );
}

function Esquinero() {
  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#881337"/>
      <line x1="70" y1="46" x2="94" y2="33" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="70" y1="68" x2="94" y2="55" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="70" y1="90" x2="94" y2="77" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round"/>

      <rect x="6" y="24" width="64" height="87" rx="3" fill="#9f1239"/>

      {/* Shelf lines */}
      <line x1="6" y1="46" x2="70" y2="46" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="68" x2="70" y2="68" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="6" y1="90" x2="70" y2="90" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round"/>

      {/* Corner diagonal divider */}
      <line x1="38" y1="24" x2="6"  y2="62" stroke="rgba(255,255,255,0.32)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="38" y1="24" x2="38" y2="111" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeLinecap="round"/>

      {/* L corner bracket */}
      <path d="M24 40 L24 54 L38 54" stroke="rgba(255,255,255,0.65)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>

      {/* Left arm items */}
      <rect x="9"  y="29" width="10" height="14" rx="2" fill="rgba(255,255,255,0.55)"/>
      <rect x="9"  y="51" width="11" height="14" rx="2" fill="rgba(255,182,193,0.65)"/>
      <rect x="9"  y="73" width="10" height="14" rx="2" fill="rgba(255,255,255,0.55)"/>
      <rect x="9"  y="95" width="11" height="13" rx="2" fill="rgba(255,182,193,0.60)"/>

      {/* Right arm items */}
      <rect x="42" y="29" width="10" height="14" rx="2" fill="rgba(255,255,255,0.50)"/>
      <rect x="55" y="31" width="9"  height="12" rx="2" fill="rgba(255,182,193,0.60)"/>
      <rect x="42" y="51" width="9"  height="14" rx="2" fill="rgba(255,255,255,0.50)"/>
      <rect x="54" y="53" width="11" height="12" rx="2" fill="rgba(255,182,193,0.55)"/>
      <rect x="42" y="73" width="10" height="14" rx="2" fill="rgba(255,255,255,0.48)"/>
      <rect x="42" y="95" width="12" height="13" rx="2" fill="rgba(255,182,193,0.55)"/>

      <polygon points="6,24 70,24 94,11 30,11" fill="#be123c"/>
      {/* L shape hint on top */}
      <polygon points="30,11 52,11 40,18 26,18" fill="rgba(0,0,0,0.14)"/>
    </>
  );
}

function Vitrina() {
  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#0a3d57"/>

      <rect x="6" y="24" width="64" height="87" rx="3" fill="#0c4a6e"/>

      {/* Metal frame */}
      <rect x="9"  y="27" width="56" height="3"  rx="1" fill="#38bdf8" opacity="0.55"/>
      <rect x="9"  y="105" width="56" height="3" rx="1" fill="#38bdf8" opacity="0.55"/>
      <rect x="9"  y="27" width="3"  height="81" rx="1" fill="#38bdf8" opacity="0.55"/>
      <rect x="62" y="27" width="3"  height="81" rx="1" fill="#38bdf8" opacity="0.55"/>
      {/* Mid frame */}
      <rect x="9"  y="66" width="56" height="2.5" rx="1" fill="#38bdf8" opacity="0.40"/>

      {/* Glass panel top */}
      <rect x="12" y="30" width="50" height="34" rx="1.5" fill="rgba(125,211,252,0.14)" stroke="rgba(125,211,252,0.28)" strokeWidth="0.5"/>
      {/* Glass panel bottom */}
      <rect x="12" y="68" width="50" height="37" rx="1.5" fill="rgba(125,211,252,0.14)" stroke="rgba(125,211,252,0.28)" strokeWidth="0.5"/>

      {/* Glass reflections */}
      <line x1="14" y1="31" x2="14" y2="63" stroke="rgba(255,255,255,0.30)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="31" x2="18" y2="63" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="12" y1="34" x2="46" y2="34" stroke="rgba(255,255,255,0.18)" strokeWidth="1" strokeLinecap="round"/>
      <line x1="14" y1="69" x2="14" y2="104" stroke="rgba(255,255,255,0.28)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="69" x2="18" y2="104" stroke="rgba(255,255,255,0.12)" strokeWidth="1" strokeLinecap="round"/>

      {/* Items through glass - top */}
      <rect x="16" y="35" width="8"  height="12" rx="1.5" fill="rgba(255,255,255,0.42)"/>
      <rect x="27" y="33" width="10" height="14" rx="1.5" fill="rgba(186,230,253,0.48)"/>
      <rect x="40" y="35" width="7"  height="12" rx="1.5" fill="rgba(255,255,255,0.38)"/>
      <rect x="50" y="34" width="9"  height="13" rx="1.5" fill="rgba(186,230,253,0.44)"/>
      {/* Items through glass - bottom */}
      <rect x="16" y="73" width="9"  height="13" rx="1.5" fill="rgba(255,255,255,0.40)"/>
      <rect x="28" y="75" width="7"  height="11" rx="1.5" fill="rgba(186,230,253,0.45)"/>
      <rect x="38" y="72" width="10" height="14" rx="1.5" fill="rgba(255,255,255,0.38)"/>
      <rect x="51" y="74" width="8"  height="12" rx="1.5" fill="rgba(186,230,253,0.42)"/>

      {/* Handle / latch */}
      <rect x="34" y="63" width="6" height="8" rx="1.5" fill="rgba(56,189,248,0.75)"/>

      <polygon points="6,24 70,24 94,11 30,11" fill="#0369a1"/>
    </>
  );
}

function Rack() {
  const units = [
    { y: 29, led: '#22c55e' },
    { y: 39, led: '#22c55e' },
    { y: 49, led: '#3b82f6' },
    { y: 59, led: '#22c55e' },
    { y: 69, led: '#f59e0b' },
    { y: 79, led: '#22c55e' },
    { y: 89, led: '#ef4444' },
    { y: 99, led: '#22c55e' },
  ];
  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#0f172a"/>
      {units.map((u, i) => (
        <line key={i} x1="70" y1={u.y + 4} x2="94" y2={u.y - 9} stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
      ))}

      <rect x="6" y="24" width="64" height="87" rx="3" fill="#1e293b"/>

      {/* Rack rails */}
      <rect x="6"  y="24" width="5" height="87" rx="1" fill="#0f172a" opacity="0.7"/>
      <rect x="65" y="24" width="5" height="87" rx="1" fill="#0f172a" opacity="0.7"/>

      {units.map((u, i) => (
        <React.Fragment key={i}>
          <rect x="11" y={u.y}   width="54" height="8"  rx="1"   fill="#334155"/>
          <rect x="13" y={u.y+1.5} width="42" height="5" rx="0.5" fill="#1e293b"/>
          {/* Port holes */}
          <rect x="18" y={u.y+2.5} width="22" height="3" rx="0.5" fill="rgba(255,255,255,0.05)"/>
          {/* Screw holes */}
          <circle cx="12"  cy={u.y + 4} r="1.5" fill="#0f172a"/>
          <circle cx="62.5" cy={u.y + 4} r="1.5" fill="#0f172a"/>
          {/* LED */}
          <circle cx="57" cy={u.y + 4} r="2"   fill={u.led} opacity="0.9"/>
          <circle cx="57" cy={u.y + 4} r="3.5" fill={u.led} opacity="0.18"/>
        </React.Fragment>
      ))}

      <polygon points="6,24 70,24 94,11 30,11" fill="#334155"/>
      {/* Vents on top */}
      <line x1="20" y1="22" x2="44" y2="9"  stroke="rgba(255,255,255,0.10)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="34" y1="22" x2="58" y2="9"  stroke="rgba(255,255,255,0.10)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="48" y1="22" x2="72" y2="9"  stroke="rgba(255,255,255,0.10)" strokeWidth="2.5" strokeLinecap="round"/>
    </>
  );
}

function Cajon() {
  const drawers = [26, 47, 68, 89];
  return (
    <>
      <polygon points="70,24 94,11 94,98 70,111" fill="#27272a"/>
      {drawers.map((y, i) => (
        <line key={i} x1="70" y1={y + 9} x2="94" y2={y - 4} stroke="rgba(255,255,255,0.12)" strokeWidth="1"/>
      ))}

      <rect x="6" y="24" width="64" height="87" rx="3" fill="#3f3f46"/>

      {drawers.map((y, i) => (
        <React.Fragment key={i}>
          {/* Drawer face */}
          <rect x="8" y={y + 1}  width="60" height="18" rx="2" fill="#52525b" stroke="rgba(255,255,255,0.10)" strokeWidth="0.5"/>
          {/* Drawer inset shadow */}
          <rect x="10" y={y + 3}  width="56" height="14" rx="1.5" fill="rgba(0,0,0,0.15)"/>
          {/* Handle */}
          <rect x="27" y={y + 8}  width="22" height="5"  rx="2.5" fill="#a1a1aa"/>
          <rect x="28" y={y + 11} width="20" height="1.5" rx="0.5" fill="rgba(0,0,0,0.25)"/>
          {/* Gap between drawers */}
          <rect x="7" y={y + 19} width="62" height="1.5" rx="0.5" fill="rgba(0,0,0,0.3)"/>
        </React.Fragment>
      ))}

      <polygon points="6,24 70,24 94,11 30,11" fill="#52525b"/>
    </>
  );
}

const RENDER = { estante: Estante, armario: Armario, remesa: Remesa, libreria: Libreria, esquinero: Esquinero, vitrina: Vitrina, rack: Rack, cajon: Cajon };

// ── Main export ───────────────────────────────────────────────────────────────
export default function Container3DIcon({ type = 'estante', size = 48, animated = true, delay = 0, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const floatDist = Math.round(size * 0.12);
  const Body = RENDER[type] || RENDER.estante;

  return (
    <>
      <style>{`
        @keyframes c3d-float-${uid} {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-${floatDist}px); }
        }
        @keyframes c3d-shadow-${uid} {
          0%, 100% { opacity: 0.20; transform: scaleX(1); }
          50%       { opacity: 0.07; transform: scaleX(0.60); }
        }
        @keyframes c3d-shine-${uid} {
          0%, 100% { opacity: 0.10; }
          50%       { opacity: 0.26; }
        }
        .c3d-body-${uid}   { animation: ${animated ? `c3d-float-${uid} 3.4s ease-in-out ${delay}s infinite` : 'none'}; }
        .c3d-shadow-${uid} { transform-origin: center; animation: ${animated ? `c3d-shadow-${uid} 3.4s ease-in-out ${delay}s infinite` : 'none'}; }
        .c3d-shine-${uid}  { animation: ${animated ? `c3d-shine-${uid} 3.4s ease-in-out ${delay}s infinite` : 'none'}; }
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
        {/* Shadow */}
        <ellipse cx="46" cy="116" rx="26" ry="4" fill="rgba(0,0,0,0.22)" className={`c3d-shadow-${uid}`}/>

        <g className={`c3d-body-${uid}`}>
          <Body/>
          {/* Universal top-face shine overlay */}
          <polygon
            points="6,24 38,24 62,11 30,11"
            fill="rgba(255,255,255,1)"
            className={`c3d-shine-${uid}`}
          />
        </g>
      </svg>
    </>
  );
}
