// The swimmer's position follows the document's scroll progress.
export const swimmer = `
  <div class="sidebar-swim" aria-hidden="true">
    <div class="swim-scene">
      <svg class="swim-illustration" viewBox="0 0 240 100" fill="none" aria-hidden="true" focusable="false">
        <defs>
          <pattern id="swim-pool-tiles" width="16" height="10" patternUnits="userSpaceOnUse">
            <path d="M16 0H0V10" stroke="currentColor" stroke-opacity=".18" stroke-width=".7" />
          </pattern>
          <clipPath id="swim-pool-clip"><rect x="8" y="62" width="224" height="30" rx="4" /></clipPath>
        </defs>
        <g class="swim-pool">
          <rect x="8" y="62" width="224" height="30" rx="4" fill="currentColor" fill-opacity=".13" />
          <rect x="8" y="62" width="224" height="30" rx="4" fill="url(#swim-pool-tiles)" />
          <g clip-path="url(#swim-pool-clip)">
            <path d="M8 87H232" stroke="currentColor" stroke-opacity=".16" stroke-width="10" />
            <path d="M16 83v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9m16-9v9" stroke="var(--sidebar)" stroke-width="1" />
            <path d="M25 74q6-3 12 0t12 0m24 3q6-3 12 0t12 0m24-3q6-3 12 0t12 0m24 3q6-3 12 0t12 0" stroke="white" stroke-opacity=".55" stroke-width="1" stroke-linecap="round" />
          </g>
          <rect x="8" y="62" width="224" height="30" rx="4" stroke="currentColor" stroke-opacity=".3" stroke-width=".8" />
        </g>
        <g class="swimmer-travel">
          <g class="swimmer-facing">
            <image class="swimmer-art swimmer-art-light" href="${import.meta.env.BASE_URL}images/swimmer.png" x="-36" y="41" width="72" height="24.06" />
            <image class="swimmer-art swimmer-art-dark" href="${import.meta.env.BASE_URL}images/swimmer-dark.png" x="-36" y="41" width="72" height="24.06" />
          </g>
        </g>
        <path class="swim-pool-surface" d="M8 63q7-3 14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0t14 0" stroke="currentColor" stroke-opacity=".5" stroke-width="1.1" />
      </svg>
    </div>
  </div>
`;

export function setupSwimmer() {
  const scene = document.querySelector('.sidebar-swim');
  let previousScroll = window.scrollY;
  let facing = -1; // The source image faces left; mirror it when moving right.

  // Reuse the navigation's scroll, resize, and content-resize update cycle.
  return function updateSwimmer() {
    const range = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const offset = Math.min(range, Math.max(0, window.scrollY));
    const progress = range > 0 ? offset / range : 0;
    if (offset > previousScroll) facing = -1;
    else if (offset < previousScroll) facing = 1;
    scene.style.setProperty('--swim-x', `${(44 + progress * 152).toFixed(3)}px`);
    scene.style.setProperty('--swim-facing', String(facing));
    previousScroll = offset;
  };
}
