// Scenario data for VolunteerProjectBackdrop's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/VolunteerProjectBackdrop, every
// other key at /isolated-components/VolunteerProjectBackdrop/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"VolunteerProjectBackdrop - <Scenario>","componentName":"VolunteerProjectBackdrop","url":"/isolated-components/VolunteerProjectBackdrop/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
// Default: a London city role's card — the chapter photo, linked through to the
// role's detail page. SharedPhoto: a role with no chapter, so it borrows the
// shared site photo; unlinked, as on a card rendered without a slug.
// `any` so the generated page can spread an entry onto a component whose `src`
// is required; `satisfies` below still checks every entry against the props.
export const scenarios: Record<string, any> = {
  Default: {
    src: '/images/chapters/london.jpg',
    href: '/volunteer/projects/city-volunteer-london',
  },
  SharedPhoto: {
    src: '/images/bg/hero-bg.jpg',
  },
} satisfies Record<string, { src: string; href?: string }>;

// Capture width, in pixels, or `undefined` for a full-width surface. Match the
// component's real container, read from its usage site — never a fabricated
// width. Centering is handled by the generated page.
// A third of the 3-column project grid, matching the Thumb isolation page.
export const captureWidth: number | undefined = 320;
