// Scenario data for BannerCta's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/BannerCta, every
// other key at /isolated-components/BannerCta/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"BannerCta - <Scenario>","componentName":"BannerCta","url":"/isolated-components/BannerCta/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
export const scenarios: Record<string, Record<string, unknown>> = {
  // The /events banner: an outside URL, so it opens in a new tab.
  Default: { href: 'https://lu.ma/harvardintech', label: 'Subscribe on Luma' },
  // The /volunteer banner: a site path, so it is base-prefixed and stays in tab.
  SitePath: { href: '/volunteer/', label: 'Join the volunteer team' },
};

// Capture width, in pixels, or `undefined` for a full-width surface. Match the
// component's real container, read from its usage site — never a fabricated
// width. Centering is handled by the generated page.
export const captureWidth: number | undefined = undefined;
