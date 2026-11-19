// AnimatedSign.jsx
// Shows one sign from signLibrary.json using real photos from public/signs/.
// If an entry has a `clip` (an mp4/webm/gif/webp of the real motion), that is
// played instead of the drawn path; Pause shows the still photo.
// Letters with motion (J, Z) show the photo of the starting handshape with an
// animated path drawn over it: a trail follows the fingertip's route and a dot
// travels along it. Pause freezes it showing the whole path. Falls back to the
// pixel sprite if a photo is missing, and honors reduced-motion.
import { useEffect, useRef, useState } from "react";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function Sprite({ pixels, name }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !pixels) return;
    const img = ctx.createImageData(28, 28);
    pixels.forEach((v, i) => img.data.set([v, v, v, 255], i * 4));
    ctx.putImageData(img, 0, 0);
  }, [pixels]);
  return <canvas ref={ref} width={28} height={28} role="img" aria-label={name} className="sign-sprite" />;
}

// The overlay uses the photo's own 240x180 coordinates so it lines up with it.
function MotionPath({ d, paused }) {
  return (
    <svg viewBox="0 0 240 180" className={`sign-overlay ${paused ? "is-paused" : ""}`} aria-hidden="true">
      <path d={d} pathLength="100" className="trail-halo" />
      <path d={d} pathLength="100" className="trail" />
      {!paused && (
        <circle r="6" className="trail-dot">
          <animateMotion
            dur="2.6s"
            repeatCount="indefinite"
            path={d}
            keyPoints="0;1;1"
            keyTimes="0;0.75;1"
            calcMode="linear"
          />
        </circle>
      )}
    </svg>
  );
}

export function AnimatedSign({ sign, pixels, size = 120, showCaption = true }) {
  const [paused, setPaused] = useState(prefersReducedMotion);
  const [failedSrc, setFailedSrc] = useState(null);
  if (!sign) return null;
  const name = sign.description || `ASL sign for ${sign.label}`;
  const clip = sign.clip && failedSrc !== sign.clip ? sign.clip : null;
  const isVideo = /\.(mp4|webm|mov)$/i.test(clip || "");
  const playingClip = clip && !paused;
  const src = playingClip && !isVideo ? clip : sign.still || sign.media;
  const broken = !src || failedSrc === src;
  // the drawn path is only the fallback when there is no real clip
  const hasPath = !clip && sign.hasMotion && sign.trace && !broken;

  return (
    <figure className="animated-sign" style={{ width: size }}>
      {/* clips are portrait phone video, the Wikimedia photos are landscape */}
      <div
        className={`sign-frame ${clip ? "is-portrait" : ""}`}
        style={{ width: size, height: Math.round(size * (clip ? 1.25 : 0.75)) }}
      >
        {playingClip && isVideo ? (
          <video
            src={clip}
            poster={sign.still}
            aria-label={name}
            autoPlay
            loop
            muted
            playsInline
            onError={() => {
              console.warn("Sign clip failed to load:", clip);
              setFailedSrc(clip);
            }}
          />
        ) : !broken ? (
          <img
            src={src}
            alt={name}
            onError={() => {
              console.warn("Sign image failed to load:", src);
              setFailedSrc(src);
            }}
          />
        ) : pixels ? (
          <Sprite pixels={pixels} name={name} />
        ) : (
          // no sprite exists for this letter (J, Z): say so instead of a blank box
          <p className="sign-missing" role="img" aria-label={name}>Image unavailable</p>
        )}
        {hasPath && <MotionPath d={sign.trace} paused={paused} />}
      </div>
      {showCaption && <figcaption>{sign.label}</figcaption>}
      {(hasPath || clip) && (
        <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
          {paused ? "Play motion" : "Pause"}
        </button>
      )}
    </figure>
  );
}
