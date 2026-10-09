// Scenario data for MissionStatement's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/MissionStatement, every
// other key at /isolated-components/MissionStatement/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"MissionStatement - <Scenario>","componentName":"MissionStatement","url":"/isolated-components/MissionStatement/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
export const scenarios: Record<string, Record<string, unknown>> = {
  // No props at all: the band's own wording (heading with its crimson tail, the
  // HAA-recognized SIG line, the three goals) — what an emptied entry shows.
  Default: {},
  // An editor's rewrite with no *emphasis* markers: the whole heading renders
  // in ink with no crimson tail, and the custom eyebrow and lede replace the
  // defaults while the goals keep theirs.
  EditedNoAccent: {
    kicker: 'Who we are',
    heading: 'Harvard alumni who build, fund and lead technology, in every city we live in',
    intro:
      'A Harvard Alumni Association Shared Interest Group for alumni working in and around technology, from first job to board seat.',
  },
};

// Capture width, in pixels, or `undefined` for a full-width surface. Match the
// component's real container, read from its usage site — never a fabricated
// width. Centering is handled by the generated page.
export const captureWidth: number | undefined = undefined;
