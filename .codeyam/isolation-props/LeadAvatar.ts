// Scenario data for LeadAvatar's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/LeadAvatar, every
// other key at /isolated-components/LeadAvatar/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"LeadAvatar - <Scenario>","componentName":"LeadAvatar","url":"/isolated-components/LeadAvatar/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
//
// A neutral silhouette stands in for a headshot rather than a real member's
// photo under an invented name.
const silhouette =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#d9d2cd"/><circle cx="80" cy="62" r="30" fill="#9c9295"/><path d="M24 160c4-36 28-56 56-56s52 20 56 56z" fill="#9c9295"/></svg>',
  );

// `name` is required, so the map is typed loosely enough for the generated page
// to spread (its `?? {}` fallback has no `name`) while `satisfies` still checks
// every fixture against the component's props.
export const scenarios: Record<string, any> = {
  // The full-profile size with a photo.
  Default: { name: 'Amara Okafor', photo: silhouette, size: 160 },
  // No photo: the initials on the crimson disc.
  Initials: { name: 'Daniel Reyes', size: 160 },
  // The committee-tile size, where the initials scale down with the disc.
  SmallInitials: { name: 'Sofia Marquez', size: 56 },
} satisfies Record<string, { name: string; photo?: string; size?: number }>;

// The avatar is a fixed-size disc; no container width applies.
export const captureWidth: number | undefined = undefined;
