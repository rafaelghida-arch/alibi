'use client';
/* Ilustrações das fotografias do caso de demonstração (SVG à mão, 400×300). */

function Grain({ id }: { id: string }) {
  return (
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .5 0" />
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
  );
}

function Cabine() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="scene">
      <defs>
        <linearGradient id="cb-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b342c" /><stop offset="1" stopColor="#1d1a17" /></linearGradient>
        <linearGradient id="cb-win" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#dfe8ee" /><stop offset="1" stopColor="#8fa7b8" /></linearGradient>
        <linearGradient id="cb-beam" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="rgba(230,240,250,.35)" /><stop offset="1" stopColor="rgba(230,240,250,0)" /></linearGradient>
        <radialGradient id="cb-screen" cx=".5" cy=".5" r=".7"><stop offset="0" stopColor="#cfe3ff" /><stop offset="1" stopColor="#5d86c0" /></radialGradient>
        <linearGradient id="cb-proj" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#56585e" /><stop offset="1" stopColor="#25262a" /></linearGradient>
        <radialGradient id="cb-flash" cx=".45" cy=".42" r=".75"><stop offset="0" stopColor="rgba(255,240,210,.22)" /><stop offset=".6" stopColor="rgba(0,0,0,0)" /><stop offset="1" stopColor="rgba(0,0,0,.6)" /></radialGradient>
        <Grain id="cb-grain" />
      </defs>
      <rect width="400" height="300" fill="url(#cb-wall)" />
      <rect y="222" width="400" height="78" fill="#15130f" />
      {/* prateleira com rolos */}
      <rect x="18" y="40" width="120" height="5" fill="#5a4a36" />
      {[30, 62, 94].map((x) => <g key={x}><circle cx={x + 10} cy="26" r="13" fill="#2b2b2e" stroke="#77787d" strokeWidth="2" /><circle cx={x + 10} cy="26" r="3" fill="#77787d" /></g>)}
      {/* relógio 10h12 */}
      <circle cx="304" cy="54" r="19" fill="#efe9dc" stroke="#2a2a2a" strokeWidth="3" />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={304 + 14 * Math.sin((i * Math.PI) / 6)} y1={54 - 14 * Math.cos((i * Math.PI) / 6)} x2={304 + 16 * Math.sin((i * Math.PI) / 6)} y2={54 - 16 * Math.cos((i * Math.PI) / 6)} stroke="#333" strokeWidth="1.4" />)}
      <line x1="304" y1="54" x2={304 + 9 * Math.sin((10.2 / 12) * 2 * Math.PI)} y2={54 - 9 * Math.cos((10.2 / 12) * 2 * Math.PI)} stroke="#111" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="304" y1="54" x2={304 + 13 * Math.sin((12 / 60) * 2 * Math.PI)} y2={54 - 13 * Math.cos((12 / 60) * 2 * Math.PI)} stroke="#111" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="304" y1="56" x2="304" y2="39" stroke="#c0392b" strokeWidth="1">
        <animateTransform attributeName="transform" type="rotate" from="0 304 54" to="360 304 54" dur="60s" repeatCount="indefinite" />
      </line>
      {/* janela */}
      <rect x="318" y="126" width="70" height="96" fill="url(#cb-win)" stroke="#2a2420" strokeWidth="5" />
      <line x1="353" y1="126" x2="353" y2="222" stroke="#2a2420" strokeWidth="3" />
      <rect x="318" y="196" width="70" height="26" fill="#9aa4ab" opacity=".6" />
      <rect x="328" y="200" width="30" height="10" fill="#8c8f96" />
      <polygon points="318,126 388,222 300,300 150,300" fill="url(#cb-beam)" />
      {/* bancada */}
      <rect x="40" y="168" width="150" height="10" fill="#4b3c2b" />
      <rect x="50" y="178" width="8" height="50" fill="#3a2e21" /><rect x="172" y="178" width="8" height="50" fill="#3a2e21" />
      {/* monitor */}
      <rect x="74" y="94" width="92" height="66" rx="3" fill="#121316" />
      <rect x="79" y="99" width="82" height="54" fill="url(#cb-screen)">
        <animate attributeName="opacity" values="1;.86;1;.93;1" dur="3.2s" repeatCount="indefinite" />
      </rect>
      {[107, 115, 123, 131, 139].map((y, i) => <rect key={y} x="84" y={y} width={[62, 70, 46, 66, 38][i]} height="3" fill={i === 1 ? '#c0392b' : '#1f3d66'} opacity=".75" />)}
      <rect x="114" y="160" width="12" height="9" fill="#1b1c20" />
      <ellipse cx="120" cy="168" rx="22" ry="3" fill="#000" opacity=".4" />
      {/* post-it */}
      <g transform="rotate(8 168 90)">
        <rect x="157" y="79" width="23" height="23" fill="#f1d34e" />
        <rect x="157" y="79" width="23" height="5" fill="#e0bf2e" />
        <path d="M160 89 h16 M160 94 h12 M160 98 h14" stroke="#3a3a8a" strokeWidth="1.3" />
      </g>
      {/* projetor */}
      <rect x="205" y="132" width="96" height="70" rx="6" fill="url(#cb-proj)" />
      <rect x="215" y="142" width="40" height="6" fill="#77797f" />
      <circle cx="205" cy="166" r="17" fill="#1a1b1e" stroke="#7a7c82" strokeWidth="3" />
      <circle cx="205" cy="166" r="8" fill="#3d6ea3"><animate attributeName="fill" values="#3d6ea3;#6c9fd6;#3d6ea3" dur="2.4s" repeatCount="indefinite" /></circle>
      <rect x="230" y="202" width="46" height="24" fill="#2b2c30" />
      <circle cx="285" cy="145" r="2.5" fill="#5bbf8a"><animate attributeName="opacity" values="1;.2;1" dur="1.4s" repeatCount="indefinite" /></circle>
      <rect width="400" height="300" fill="url(#cb-flash)" />
      <rect width="400" height="300" filter="url(#cb-grain)" opacity=".35" />
    </svg>
  );
}

function Quadro() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="scene">
      <defs>
        <linearGradient id="qd-wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#4a4a43" /><stop offset="1" stopColor="#2a2a26" /></linearGradient>
        <linearGradient id="qd-box" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9a9d9f" /><stop offset="1" stopColor="#55585b" /></linearGradient>
        <linearGradient id="qd-door" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#7d8083" /><stop offset="1" stopColor="#4a4d50" /></linearGradient>
        <radialGradient id="qd-flash" cx=".4" cy=".38" r=".8"><stop offset="0" stopColor="rgba(255,250,235,.28)" /><stop offset=".55" stopColor="rgba(0,0,0,0)" /><stop offset="1" stopColor="rgba(0,0,0,.65)" /></radialGradient>
        <Grain id="qd-grain" />
      </defs>
      <rect width="400" height="300" fill="url(#qd-wall)" />
      <rect y="250" width="400" height="50" fill="#1e1d1a" />
      {/* porta lateral */}
      <rect x="318" y="96" width="82" height="160" fill="#5b3f2a" stroke="#2c1f15" strokeWidth="5" />
      <rect x="330" y="110" width="58" height="56" fill="none" stroke="#3e2b1d" strokeWidth="3" />
      <circle cx="336" cy="216" r="5" fill="#c9a56a" stroke="#6d5634" strokeWidth="1.5" />
      <rect x="331" y="224" width="10" height="4" fill="#2a2a2a" />
      {/* caixa do quadro */}
      <rect x="88" y="46" width="166" height="158" rx="4" fill="url(#qd-box)" stroke="#333" strokeWidth="2" />
      <rect x="98" y="56" width="146" height="138" fill="#2c2e30" />
      {/* disjuntores */}
      {[0, 1, 2].map((r) =>
        Array.from({ length: 6 }, (_, i) => (
          <g key={`${r}-${i}`}>
            <rect x={168 + i * 12} y={72 + r * 40} width="9" height="26" fill="#e9e6df" />
            <rect x={169.5 + i * 12} y={76 + r * 40 + ((i + r) % 3 === 0 ? 10 : 0)} width="6" height="8" fill="#333" />
          </g>
        )),
      )}
      {/* geral */}
      <rect x="130" y="84" width="30" height="52" fill="#f0ede6" />
      <rect x="137" y="93" width="16" height="16" fill="#b02a1a" />
      <rect x="110" y="140" width="68" height="12" fill="#f3e9b8" transform="rotate(-2 144 146)" />
      <text x="114" y="149" fontSize="7" fill="#7a1d12" fontFamily="'Caveat', cursive" fontWeight="700" transform="rotate(-2 144 146)">GERAL · NÃO DESLIGAR</text>
      {/* poeira com marca de dedo */}
      {Array.from({ length: 70 }, (_, i) => <circle key={i} cx={102 + ((i * 37) % 140)} cy={60 + ((i * 53) % 130)} r={0.6 + (i % 3) * 0.3} fill="#b9b3a4" opacity={Math.abs(102 + ((i * 37) % 140) - 145) < 14 && 60 + ((i * 53) % 130) < 140 ? 0.05 : 0.45} />)}
      <path d="M134 80 q11 6 22 0" stroke="rgba(255,255,255,.18)" strokeWidth="6" fill="none" strokeLinecap="round" />
      {/* portinhola aberta */}
      <polygon points="254,46 306,58 306,196 254,204" fill="url(#qd-door)" stroke="#333" strokeWidth="2" />
      <rect x="290" y="118" width="8" height="18" rx="2" fill="#2a2a2a" />
      <line x1="80" y1="0" x2="80" y2="46" stroke="#222" strokeWidth="5" />
      <rect width="400" height="300" fill="url(#qd-flash)" />
      <rect width="400" height="300" filter="url(#qd-grain)" opacity=".35" />
    </svg>
  );
}

function Fachada() {
  const letters = 'AURORA'.split('');
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="scene">
      <defs>
        <linearGradient id="fc-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7c8790" /><stop offset="1" stopColor="#b9c0c4" /></linearGradient>
        <linearGradient id="fc-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c9b896" /><stop offset="1" stopColor="#8f7e60" /></linearGradient>
        <linearGradient id="fc-wet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b3d40" /><stop offset="1" stopColor="#1c1d1f" /></linearGradient>
        <radialGradient id="fc-vig" cx=".5" cy=".45" r=".8"><stop offset=".5" stopColor="rgba(0,0,0,0)" /><stop offset="1" stopColor="rgba(0,0,0,.55)" /></radialGradient>
        <Grain id="fc-grain" />
      </defs>
      <rect width="400" height="300" fill="url(#fc-sky)" />
      <rect x="60" y="20" width="280" height="230" fill="url(#fc-wall)" />
      {[0, 1, 2, 3].map((i) => <rect key={i} x={80 + i * 66} y="34" width="40" height="40" fill="#5e6a72" stroke="#6e5f45" strokeWidth="3" />)}
      {/* letreiro vertical */}
      <rect x="182" y="6" width="36" height="150" rx="4" fill="#7a1d12" stroke="#3a0d08" strokeWidth="3" />
      {letters.map((l, i) => (
        <text key={i} x="200" y={34 + i * 22} fontSize="19" textAnchor="middle" fill="#fff3c4" fontWeight="800" fontFamily="var(--display)">
          {l}
          <animate attributeName="fill" values="#fff3c4;#fff3c4;#a07a4a;#fff3c4" dur="5s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
        </text>
      ))}
      {Array.from({ length: 14 }, (_, i) => (
        <circle key={i} cx={i % 2 ? 213 : 187} cy={14 + i * 10.5} r="1.8" fill="#ffd88a">
          <animate attributeName="opacity" values="1;.25;1" dur="1.2s" begin={`${(i % 4) * 0.3}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* marquise */}
      <polygon points="40,150 360,150 380,176 20,176" fill="#2b2b2e" />
      <rect x="58" y="154" width="284" height="18" fill="#f4efe3" />
      <text x="200" y="167" fontSize="10.5" textAnchor="middle" fill="#2b2b2e" fontFamily="var(--mono)" fontWeight="700" letterSpacing="1.5">FESTIVAL DE INVERNO · ENCERRAMENTO</text>
      {Array.from({ length: 30 }, (_, i) => (
        <circle key={i} cx={30 + i * 11.7} cy="179" r="1.6" fill="#ffd88a"><animate attributeName="opacity" values=".3;1;.3" dur="1.6s" begin={`${(i % 3) * 0.25}s`} repeatCount="indefinite" /></circle>
      ))}
      {/* cartazes e portas */}
      <rect x="78" y="190" width="40" height="56" fill="#1f3554" /><rect x="84" y="196" width="28" height="30" fill="#c9a56a" />
      <rect x="282" y="190" width="40" height="56" fill="#5c1f2b" /><rect x="288" y="196" width="28" height="30" fill="#e5c07b" />
      <rect x="150" y="186" width="100" height="64" fill="#26292d" />
      <rect x="156" y="192" width="42" height="58" fill="#3d4a55" opacity=".85" /><rect x="202" y="192" width="42" height="58" fill="#3d4a55" opacity=".85" />
      <rect x="156" y="192" width="88" height="58" fill="rgba(255,220,150,.15)"><animate attributeName="opacity" values=".6;1;.6" dur="4s" repeatCount="indefinite" /></rect>
      {/* calçada molhada com reflexo */}
      <rect y="250" width="400" height="50" fill="url(#fc-wet)" />
      <rect x="182" y="252" width="36" height="44" fill="#7a1d12" opacity=".35" />
      <rect x="58" y="252" width="284" height="6" fill="#f4efe3" opacity=".12" />
      <rect width="400" height="300" fill="url(#fc-vig)" />
      <rect width="400" height="300" filter="url(#fc-grain)" opacity=".3" />
    </svg>
  );
}

export function Scene({ id }: { id: string }) {
  if (id === 'cabine') return <Cabine />;
  if (id === 'quadro') return <Quadro />;
  if (id === 'fachada') return <Fachada />;
  return null;
}
