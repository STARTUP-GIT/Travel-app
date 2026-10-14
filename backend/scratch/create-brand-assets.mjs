import fs from "fs";
import path from "path";

const EMBLEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
  <defs>
    <radialGradient id="globeGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#0E3A6C"/>
      <stop offset="50%" stop-color="#0B2545"/>
      <stop offset="100%" stop-color="#061527"/>
    </radialGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="45%" stop-color="#D9A441"/>
      <stop offset="100%" stop-color="#996D19"/>
    </linearGradient>
    <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6"/>
      <stop offset="100%" stop-color="#087E8B"/>
    </linearGradient>
    <linearGradient id="orbitGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D9A441" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#FACC15" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.9"/>
    </linearGradient>
    <filter id="goldGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Outer Compass Ring -->
  <circle cx="100" cy="100" r="92" stroke="url(#goldGrad)" stroke-width="1.2" opacity="0.45" stroke-dasharray="2 4"/>
  <circle cx="100" cy="100" r="88" stroke="url(#goldGrad)" stroke-width="1.8" opacity="0.75"/>
  <circle cx="100" cy="100" r="84" stroke="url(#tealGrad)" stroke-width="0.8" opacity="0.6"/>

  <!-- Compass Cardinal Points -->
  <!-- North -->
  <polygon points="100,6 94,22 100,18 106,22" fill="url(#goldGrad)"/>
  <polygon points="100,18 94,22 100,32" fill="#996D19"/>
  <polygon points="100,18 106,22 100,32" fill="#FDE047"/>
  <!-- South -->
  <polygon points="100,194 94,178 100,182 106,178" fill="url(#goldGrad)"/>
  <polygon points="100,182 94,178 100,168" fill="#996D19"/>
  <polygon points="100,182 106,178 100,168" fill="#FDE047"/>
  <!-- East -->
  <polygon points="194,100 178,94 182,100 178,106" fill="url(#goldGrad)"/>
  <polygon points="182,100 178,94 168,100" fill="#996D19"/>
  <polygon points="182,100 178,106 168,100" fill="#FDE047"/>
  <!-- West -->
  <polygon points="6,100 22,94 18,100 22,106" fill="url(#goldGrad)"/>
  <polygon points="18,100 22,94 32,100" fill="#996D19"/>
  <polygon points="18,100 22,106 32,100" fill="#FDE047"/>

  <!-- Globe Sphere -->
  <circle cx="100" cy="100" r="70" fill="url(#globeGrad)" stroke="url(#tealGrad)" stroke-width="2"/>

  <!-- Parallels & Meridians -->
  <ellipse cx="100" cy="100" rx="68" ry="24" stroke="#087E8B" stroke-width="0.75" opacity="0.45" fill="none"/>
  <ellipse cx="100" cy="100" rx="68" ry="48" stroke="#087E8B" stroke-width="0.75" opacity="0.35" fill="none"/>
  <line x1="30" y1="100" x2="170" y2="100" stroke="#087E8B" stroke-width="0.9" opacity="0.5"/>
  <ellipse cx="100" cy="100" rx="24" ry="68" stroke="#087E8B" stroke-width="0.75" opacity="0.45" fill="none"/>
  <ellipse cx="100" cy="100" rx="48" ry="68" stroke="#087E8B" stroke-width="0.75" opacity="0.35" fill="none"/>
  <line x1="100" y1="30" x2="100" y2="170" stroke="#087E8B" stroke-width="0.9" opacity="0.5"/>

  <!-- Surrounding Landmass Hints (Central Asia, Arabia, SE Asia) -->
  <path d="M52,72 Q65,68 76,74 Q80,82 74,90 Q62,94 54,84 Z" fill="#0E3A6C" opacity="0.55"/>
  <path d="M128,96 Q138,98 144,110 Q140,126 132,122 Q124,114 126,102 Z" fill="#0E3A6C" opacity="0.55"/>
  <path d="M72,50 Q96,44 124,48 Q136,54 122,60 Q96,56 74,58 Z" fill="#0E3A6C" opacity="0.45"/>

  <!-- Geographically Accurate India Subcontinent with Siliguri Corridor & NE States -->
  <!-- Subtle back-illumination glow for India -->
  <path d="M96,54 L104,55 L108,61 L106,66 L98,68 L92,71 L86,77 L83,84 L88,90 L91,96 L93,105 L96,116 L98,126 L99,128 L101,124 L103,115 L107,106 L112,98 L114,92 L116,86 L114,83 L118,80 L123,78 L127,82 L125,87 L120,88 L117,86 L115,88 L113,92 L109,95 L106,88 L103,82 L100,74 L98,66 Z" 
        fill="url(#goldGrad)" opacity="0.3" filter="url(#goldGlow)"/>

  <!-- Solid Main India Fill -->
  <path d="M96,54 L104,55 L108,61 L106,66 L98,68 L92,71 L86,77 L83,84 L88,90 L91,96 L93,105 L96,116 L98,126 L99,128 L101,124 L103,115 L107,106 L112,98 L114,92 L116,86 L114,83 L118,80 L123,78 L127,82 L125,87 L120,88 L117,86 L115,88 L113,92 L109,95 L106,88 L103,82 L100,74 L98,66 Z" 
        fill="#087E8B" stroke="url(#goldGrad)" stroke-width="1.8" stroke-linejoin="round"/>

  <!-- Sri Lanka -->
  <ellipse cx="103" cy="133" rx="2.2" ry="3.2" fill="#087E8B" stroke="url(#goldGrad)" stroke-width="0.9"/>

  <!-- Andaman and Nicobar Islands -->
  <circle cx="127" cy="116" r="1.1" fill="url(#goldGrad)"/>
  <circle cx="128" cy="121" r="1" fill="url(#goldGrad)"/>
  <circle cx="129" cy="126" r="1.1" fill="url(#goldGrad)"/>

  <!-- Lakshadweep -->
  <circle cx="90" cy="118" r="0.9" fill="url(#goldGrad)"/>
  <circle cx="91" cy="123" r="0.9" fill="url(#goldGrad)"/>

  <!-- Prominent Destination Pinpoints in India -->
  <!-- Delhi -->
  <circle cx="98" cy="71" r="2" fill="#FFFFFF"/>
  <circle cx="98" cy="71" r="1" fill="#D9A441"/>
  <!-- Mumbai -->
  <circle cx="89" cy="94" r="1.8" fill="#FFFFFF"/>
  <circle cx="89" cy="94" r="0.9" fill="#D9A441"/>
  <!-- Karnataka / Bengaluru -->
  <circle cx="96" cy="114" r="2.2" fill="#FDE047"/>
  <circle cx="96" cy="114" r="1.1" fill="#0B2545"/>
  <!-- Kolkata / East -->
  <circle cx="112" cy="88" r="1.6" fill="#FFFFFF"/>
  <!-- Varanasi / Central -->
  <circle cx="104" cy="79" r="1.6" fill="#FFFFFF"/>

  <!-- Elegant Orbital Travel Route Arc -->
  <path d="M28,142 C42,168 88,162 136,134 C168,114 186,84 174,58" 
        stroke="url(#orbitGrad)" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <path d="M36,140 C52,164 96,156 140,130 C170,110 186,80 172,56" 
        stroke="#D9A441" stroke-width="0.8" stroke-dasharray="3 3" fill="none" opacity="0.8"/>

  <!-- Passenger Airplane in Flight -->
  <g transform="translate(164, 62) rotate(-38) scale(0.95)">
    <!-- Fuselage -->
    <path d="M0,-14 C2,-14 3.5,-10 3.5,6 L3.5,14 L1.5,17 L-1.5,17 L-3.5,14 L-3.5,6 C-3.5,-10 -2,-14 0,-14 Z" fill="#FFFFFF"/>
    <!-- Wings -->
    <path d="M0,-2 L18,7 L17,10 L0,4 L-17,10 L-18,7 Z" fill="#F8FAFC"/>
    <!-- Tail Fin -->
    <path d="M0,8 L7,16 L5,17 L0,14 L-5,17 L-7,16 Z" fill="url(#goldGrad)"/>
    <!-- Cockpit & Windows -->
    <ellipse cx="0" cy="-10" rx="1.2" ry="2" fill="#0B2545"/>
    <path d="M1.5,-4 L1.5,4" stroke="#087E8B" stroke-width="0.6"/>
    <path d="M-1.5,-4 L-1.5,4" stroke="#087E8B" stroke-width="0.6"/>
  </g>
</svg>`;

const SYMBOL_SVG = EMBLEM_SVG;

const PRIMARY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 120" fill="none">
  <defs>
    <radialGradient id="pGlobeGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#0E3A6C"/>
      <stop offset="50%" stop-color="#0B2545"/>
      <stop offset="100%" stop-color="#061527"/>
    </radialGradient>
    <linearGradient id="pGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="45%" stop-color="#D9A441"/>
      <stop offset="100%" stop-color="#996D19"/>
    </linearGradient>
    <linearGradient id="pTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#14B8A6"/>
      <stop offset="100%" stop-color="#087E8B"/>
    </linearGradient>
    <linearGradient id="pOrbitGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D9A441" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#FACC15" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.9"/>
    </linearGradient>
  </defs>

  <!-- Emblem Icon Scaled to 100x100 at x=10, y=10 -->
  <g transform="translate(10, 10) scale(0.5)">
    <!-- Outer Rings -->
    <circle cx="100" cy="100" r="92" stroke="url(#pGoldGrad)" stroke-width="1.8" opacity="0.45" stroke-dasharray="3 5"/>
    <circle cx="100" cy="100" r="86" stroke="url(#pGoldGrad)" stroke-width="2.2" opacity="0.8"/>
    <!-- Compass Points -->
    <polygon points="100,6 94,22 100,18 106,22" fill="url(#pGoldGrad)"/>
    <polygon points="100,194 94,178 100,182 106,178" fill="url(#pGoldGrad)"/>
    <polygon points="194,100 178,94 182,100 178,106" fill="url(#pGoldGrad)"/>
    <polygon points="6,100 22,94 18,100 22,106" fill="url(#pGoldGrad)"/>
    <!-- Globe -->
    <circle cx="100" cy="100" r="70" fill="url(#pGlobeGrad)" stroke="url(#pTealGrad)" stroke-width="2.5"/>
    <!-- Grids -->
    <ellipse cx="100" cy="100" rx="68" ry="24" stroke="#087E8B" stroke-width="0.9" opacity="0.45" fill="none"/>
    <ellipse cx="100" cy="100" rx="68" ry="48" stroke="#087E8B" stroke-width="0.9" opacity="0.35" fill="none"/>
    <ellipse cx="100" cy="100" rx="24" ry="68" stroke="#087E8B" stroke-width="0.9" opacity="0.45" fill="none"/>
    <!-- India Map -->
    <path d="M96,54 L104,55 L108,61 L106,66 L98,68 L92,71 L86,77 L83,84 L88,90 L91,96 L93,105 L96,116 L98,126 L99,128 L101,124 L103,115 L107,106 L112,98 L114,92 L116,86 L114,83 L118,80 L123,78 L127,82 L125,87 L120,88 L117,86 L115,88 L113,92 L109,95 L106,88 L103,82 L100,74 L98,66 Z" 
          fill="#087E8B" stroke="url(#pGoldGrad)" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="103" cy="133" rx="2.5" ry="3.5" fill="#087E8B" stroke="url(#pGoldGrad)" stroke-width="1"/>
    <circle cx="127" cy="116" r="1.3" fill="url(#pGoldGrad)"/>
    <circle cx="128" cy="121" r="1.2" fill="url(#pGoldGrad)"/>
    <circle cx="90" cy="118" r="1.1" fill="url(#pGoldGrad)"/>
    <!-- Markers -->
    <circle cx="98" cy="71" r="2.2" fill="#FFFFFF"/>
    <circle cx="96" cy="114" r="2.6" fill="#FDE047"/>
    <!-- Orbit -->
    <path d="M28,142 C42,168 88,162 136,134 C168,114 186,84 174,58" 
          stroke="url(#pOrbitGrad)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <!-- Airplane -->
    <g transform="translate(164, 62) rotate(-38)">
      <path d="M0,-14 C2,-14 3.5,-10 3.5,6 L3.5,14 L1.5,17 L-1.5,17 L-3.5,14 L-3.5,6 Z" fill="#FFFFFF"/>
      <path d="M0,-2 L18,7 L17,10 L0,4 L-17,10 L-18,7 Z" fill="#F8FAFC"/>
      <path d="M0,8 L7,16 L5,17 L0,14 L-5,17 L-7,16 Z" fill="url(#pGoldGrad)"/>
    </g>
  </g>

  <!-- Wordmark: ATLASWANDERS -->
  <text x="126" y="65" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, 'Outfit', 'Inter', sans-serif" font-weight="900" font-size="38" letter-spacing="2">
    <tspan fill="#0B2545">ATLAS</tspan>
    <tspan fill="#087E8B">WANDERS</tspan>
  </text>

  <!-- Tagline: Discover Places. Experience Local. -->
  <text x="128" y="92" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, 'Outfit', 'Inter', sans-serif" font-weight="700" font-size="12.5" letter-spacing="3.2" fill="#D9A441">
    DISCOVER PLACES <tspan fill="#087E8B">•</tspan> EXPERIENCE LOCAL
  </text>
</svg>`;

const LIGHT_SVG = PRIMARY_SVG;

const DARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 120" fill="none">
  <defs>
    <radialGradient id="dGlobeGrad" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#144272"/>
      <stop offset="50%" stop-color="#0B2545"/>
      <stop offset="100%" stop-color="#040D18"/>
    </radialGradient>
    <linearGradient id="dGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FDE047"/>
      <stop offset="45%" stop-color="#D9A441"/>
      <stop offset="100%" stop-color="#B48222"/>
    </linearGradient>
    <linearGradient id="dTealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2DD4BF"/>
      <stop offset="100%" stop-color="#0D9488"/>
    </linearGradient>
    <linearGradient id="dOrbitGrad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D9A441" stop-opacity="0.1"/>
      <stop offset="50%" stop-color="#FACC15" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0.9"/>
    </linearGradient>
  </defs>

  <!-- Emblem Icon Scaled to 100x100 at x=10, y=10 -->
  <g transform="translate(10, 10) scale(0.5)">
    <!-- Outer Rings -->
    <circle cx="100" cy="100" r="92" stroke="url(#dGoldGrad)" stroke-width="1.8" opacity="0.45" stroke-dasharray="3 5"/>
    <circle cx="100" cy="100" r="86" stroke="url(#dGoldGrad)" stroke-width="2.2" opacity="0.8"/>
    <!-- Compass Points -->
    <polygon points="100,6 94,22 100,18 106,22" fill="url(#dGoldGrad)"/>
    <polygon points="100,194 94,178 100,182 106,178" fill="url(#dGoldGrad)"/>
    <polygon points="194,100 178,94 182,100 178,106" fill="url(#dGoldGrad)"/>
    <polygon points="6,100 22,94 18,100 22,106" fill="url(#dGoldGrad)"/>
    <!-- Globe -->
    <circle cx="100" cy="100" r="70" fill="url(#dGlobeGrad)" stroke="url(#dTealGrad)" stroke-width="2.5"/>
    <!-- Grids -->
    <ellipse cx="100" cy="100" rx="68" ry="24" stroke="#14B8A6" stroke-width="0.9" opacity="0.45" fill="none"/>
    <ellipse cx="100" cy="100" rx="68" ry="48" stroke="#14B8A6" stroke-width="0.9" opacity="0.35" fill="none"/>
    <ellipse cx="100" cy="100" rx="24" ry="68" stroke="#14B8A6" stroke-width="0.9" opacity="0.45" fill="none"/>
    <!-- India Map -->
    <path d="M96,54 L104,55 L108,61 L106,66 L98,68 L92,71 L86,77 L83,84 L88,90 L91,96 L93,105 L96,116 L98,126 L99,128 L101,124 L103,115 L107,106 L112,98 L114,92 L116,86 L114,83 L118,80 L123,78 L127,82 L125,87 L120,88 L117,86 L115,88 L113,92 L109,95 L106,88 L103,82 L100,74 L98,66 Z" 
          fill="#0D9488" stroke="url(#dGoldGrad)" stroke-width="2" stroke-linejoin="round"/>
    <ellipse cx="103" cy="133" rx="2.5" ry="3.5" fill="#0D9488" stroke="url(#dGoldGrad)" stroke-width="1"/>
    <circle cx="127" cy="116" r="1.3" fill="url(#dGoldGrad)"/>
    <circle cx="128" cy="121" r="1.2" fill="url(#dGoldGrad)"/>
    <circle cx="90" cy="118" r="1.1" fill="url(#dGoldGrad)"/>
    <!-- Markers -->
    <circle cx="98" cy="71" r="2.2" fill="#FFFFFF"/>
    <circle cx="96" cy="114" r="2.6" fill="#FDE047"/>
    <!-- Orbit -->
    <path d="M28,142 C42,168 88,162 136,134 C168,114 186,84 174,58" 
          stroke="url(#dOrbitGrad)" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <!-- Airplane -->
    <g transform="translate(164, 62) rotate(-38)">
      <path d="M0,-14 C2,-14 3.5,-10 3.5,6 L3.5,14 L1.5,17 L-1.5,17 L-3.5,14 L-3.5,6 Z" fill="#FFFFFF"/>
      <path d="M0,-2 L18,7 L17,10 L0,4 L-17,10 L-18,7 Z" fill="#F8FAFC"/>
      <path d="M0,8 L7,16 L5,17 L0,14 L-5,17 L-7,16 Z" fill="url(#dGoldGrad)"/>
    </g>
  </g>

  <!-- Wordmark: ATLASWANDERS (White + Vibrant Teal) -->
  <text x="126" y="65" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, 'Outfit', 'Inter', sans-serif" font-weight="900" font-size="38" letter-spacing="2">
    <tspan fill="#FFFFFF">ATLAS</tspan>
    <tspan fill="#2DD4BF">WANDERS</tspan>
  </text>

  <!-- Tagline: Discover Places. Experience Local. -->
  <text x="128" y="92" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, 'Outfit', 'Inter', sans-serif" font-weight="700" font-size="12.5" letter-spacing="3.2" fill="#FDE047">
    DISCOVER PLACES <tspan fill="#2DD4BF">•</tspan> EXPERIENCE LOCAL
  </text>
</svg>`;

const FAVICON_SVG = EMBLEM_SVG;

const targetDirs = [
  "c:/Users/Admin/OneDrive/Desktop/Main App/frontend/public/brand",
  "c:/Users/Admin/OneDrive/Desktop/Main App/service-frontend/public/brand",
  "c:/Users/Admin/OneDrive/Desktop/Main App/admin/public/brand",
  "c:/Users/Admin/OneDrive/Desktop/Main App/backend/src/brand-assets",
];

const ogSource = "C:/Users/Admin/.gemini/antigravity-ide/brain/21f0f7bd-3c72-4c38-91f0-7bf9a02cc5dc/atlaswanders_og_banner_1791993847242.jpg";

for (const dir of targetDirs) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "atlaswanders-symbol.svg"), SYMBOL_SVG);
  fs.writeFileSync(path.join(dir, "atlaswanders-primary.svg"), PRIMARY_SVG);
  fs.writeFileSync(path.join(dir, "atlaswanders-light.svg"), LIGHT_SVG);
  fs.writeFileSync(path.join(dir, "atlaswanders-dark.svg"), DARK_SVG);
  fs.writeFileSync(path.join(dir, "atlaswanders-favicon.svg"), FAVICON_SVG);

  if (fs.existsSync(ogSource)) {
    fs.copyFileSync(ogSource, path.join(dir, "atlaswanders_og_banner.jpg"));
  }
}

console.log("All ATLASWANDERS brand assets successfully created across all frontend and backend targets!");
