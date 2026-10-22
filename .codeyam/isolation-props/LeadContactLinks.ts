// Scenario data for LeadContactLinks's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/LeadContactLinks, every
// other key at /isolated-components/LeadContactLinks/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"LeadContactLinks - <Scenario>","componentName":"LeadContactLinks","url":"/isolated-components/LeadContactLinks/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
// `name` is required, so the map is typed loosely enough for the generated page
// to spread (its `?? {}` fallback has no `name`) while `satisfies` still checks
// every fixture against the component's props.
export const scenarios: Record<string, any> = {
  // Both links: the LinkedIn mark and the envelope.
  Default: {
    name: 'Amara Okafor',
    linkedin: 'https://www.linkedin.com/',
    email: 'amara@example.com',
  },
  // LinkedIn only — the most common real entry.
  LinkedInOnly: { name: 'Daniel Reyes', linkedin: 'https://www.linkedin.com/' },
} satisfies Record<string, { name: string; linkedin?: string; email?: string }>;

// A short row of icon buttons; no container width applies.
export const captureWidth: number | undefined = undefined;
