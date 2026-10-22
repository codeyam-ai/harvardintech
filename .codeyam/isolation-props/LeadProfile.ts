// Scenario data for LeadProfile's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/LeadProfile, every
// other key at /isolated-components/LeadProfile/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"LeadProfile - <Scenario>","componentName":"LeadProfile","url":"/isolated-components/LeadProfile/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
import type { Lead } from '../../src/lib/leadSchema';

// The people are fixtures, not real leads, and the headshot is a neutral
// silhouette rather than a real member's photo under an invented name.
const silhouette =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" fill="#d9d2cd"/><circle cx="80" cy="62" r="30" fill="#9c9295"/><path d="M24 160c4-36 28-56 56-56s52 20 56 56z" fill="#9c9295"/></svg>',
  );

// `lead` is required, so the map is typed loosely enough for the generated page
// to spread (its `?? {}` fallback has no `lead`) while `satisfies` still checks
// every fixture against the real `Lead` shape.
export const scenarios: Record<string, any> = {
  // Every optional field filled, so each line of the mockup is in the frame.
  Default: {
    lead: {
      name: 'Amara Okafor',
      role: 'Chapter Lead',
      photo: silhouette,
      title: 'Co-founder and CEO',
      company: 'Lumen Health',
      school: 'Harvard Kennedy School',
      degree: 'MPA',
      gradYear: 2019,
      linkedin: 'https://www.linkedin.com/',
      email: 'amara@example.com',
      bio: 'Amara builds clinical software for community hospitals and has run the chapter’s founder roundtables since 2024. Before Lumen she led product at two health-tech startups.',
    },
  },
  // An entry from before profiles existed: only a name and role. Initials fill
  // the disc and every other line drops out.
  NameAndRoleOnly: {
    lead: { name: 'Daniel Reyes', role: 'Co-Lead' },
  },
} satisfies Record<string, { lead: Lead }>;

// The leads block sits in the page's narrow column (`.wrap--narrow`, 760px).
export const captureWidth: number | undefined = 760;
