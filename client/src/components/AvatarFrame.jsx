import { resolveFrame } from "../lib/cosmetics.js";

const SIZES = {
  sm: "h-11 w-11",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

export default function AvatarFrame({ id, src, size = "md", alt = "" }) {
  const frame = resolveFrame(id);
  return (
    <div className={`relative ${SIZES[size] || SIZES.md}`}>
      <img
        src={src}
        alt={alt}
        className={`h-full w-full rounded-full object-cover ring-2 ring-white/30 ${
          frame === "main_character" ? "ring-4 ring-yellow-300" : ""
        }`}
      />
      {frame === "kitty" && <Kitty />}
      {frame === "blossom" && <Blossom />}
      {frame === "deal_with_it" && <Shades />}
      {frame === "royalty" && <Crown />}
      {frame === "chaos" && <Horns />}
      {frame === "angel" && <Halo />}
      {frame === "yarr" && <Bandana />}
      {frame === "main_character" && <Sparkles />}
      {frame === "toadstool" && <Mushrooms />}
      {frame === "filmstrip" && <Filmstrip />}
      {frame === "blade" && <Blade />}
    </div>
  );
}

function Kitty() {
  return (
    <svg viewBox="0 0 64 24" className="pointer-events-none absolute -top-3 left-0 h-6 w-full">
      <polygon points="8,22 16,2 28,22" fill="#1f2937" />
      <polygon points="12,20 16,8 22,20" fill="#f9a8d4" />
      <polygon points="36,22 48,2 56,22" fill="#1f2937" />
      <polygon points="42,20 48,8 52,20" fill="#f9a8d4" />
    </svg>
  );
}

function Crown() {
  return (
    <svg viewBox="0 0 64 28" className="pointer-events-none absolute -top-4 left-1/2 h-7 w-[110%] -translate-x-1/2">
      <polygon points="6,22 12,6 22,16 32,2 42,16 52,6 58,22" fill="#facc15" stroke="#b45309" strokeWidth="2" />
      <circle cx="12" cy="8" r="2.5" fill="#ef4444" />
      <circle cx="32" cy="4" r="2.5" fill="#38bdf8" />
      <circle cx="52" cy="8" r="2.5" fill="#a855f7" />
    </svg>
  );
}

function Horns() {
  return (
    <svg viewBox="0 0 64 24" className="pointer-events-none absolute -top-3 left-0 h-6 w-full">
      <path d="M10 22 C12 4 22 2 26 18" fill="none" stroke="#7f1d1d" strokeWidth="6" strokeLinecap="round" />
      <path d="M54 22 C52 4 42 2 38 18" fill="none" stroke="#7f1d1d" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function Halo() {
  return (
    <svg viewBox="0 0 64 16" className="pointer-events-none absolute -top-3 left-0 h-4 w-full">
      <ellipse cx="32" cy="8" rx="18" ry="5" fill="none" stroke="#fde68a" strokeWidth="3" />
    </svg>
  );
}

function Blossom() {
  return (
    <div className="pointer-events-none absolute -top-2 left-0 flex w-full justify-center gap-0.5 text-[11px] leading-none">
      <span>🌸</span>
      <span>🌼</span>
      <span>🌸</span>
    </div>
  );
}

function Shades() {
  return (
    <svg viewBox="0 0 64 24" className="pointer-events-none absolute top-[38%] left-0 h-[28%] w-full">
      <rect x="8" y="6" width="20" height="12" rx="3" fill="#111" />
      <rect x="36" y="6" width="20" height="12" rx="3" fill="#111" />
      <rect x="28" y="9" width="8" height="3" fill="#111" />
    </svg>
  );
}

function Bandana() {
  return (
    <svg viewBox="0 0 64 20" className="pointer-events-none absolute top-0 left-0 h-5 w-full">
      <path d="M4 12 Q32 0 60 12 L60 18 Q32 8 4 18 Z" fill="#dc2626" />
      <circle cx="32" cy="8" r="2" fill="#fde047" />
    </svg>
  );
}

function Sparkles() {
  return (
    <div className="pointer-events-none absolute -inset-2 text-[10px] leading-none">
      <span className="absolute left-0 top-0">✨</span>
      <span className="absolute right-0 top-1">⭐</span>
      <span className="absolute bottom-0 left-1">✨</span>
    </div>
  );
}

function Mushrooms() {
  return (
    <div className="pointer-events-none absolute -bottom-1 left-0 flex w-full justify-between px-0.5 text-[11px] leading-none">
      <span>🍄</span>
      <span>🍄</span>
    </div>
  );
}

function Blade() {
  return (
    <svg viewBox="0 0 24 40" className="pointer-events-none absolute -right-2 top-1 h-8 w-5 -rotate-12">
      <rect x="9" y="18" width="6" height="14" rx="1" fill="#78716c" />
      <rect x="7" y="16" width="10" height="4" rx="1" fill="#44403c" />
      <polygon points="12,2 16,16 8,16" fill="#e7e5e4" stroke="#a8a29e" strokeWidth="1" />
    </svg>
  );
}

function Filmstrip() {
  return (
    <svg viewBox="0 0 64 64" className="pointer-events-none absolute -inset-1 h-[calc(100%+8px)] w-[calc(100%+8px)] -translate-x-0.5 -translate-y-0.5">
      <rect x="2" y="2" width="60" height="60" rx="8" fill="none" stroke="#111" strokeWidth="8" />
      <rect x="2" y="2" width="60" height="60" rx="8" fill="none" stroke="#facc15" strokeWidth="3" />
      {[10, 22, 34, 46].map((y) => (
        <g key={y}>
          <rect x="6" y={y} width="6" height="6" rx="1" fill="#111" />
          <rect x="52" y={y} width="6" height="6" rx="1" fill="#111" />
        </g>
      ))}
    </svg>
  );
}
