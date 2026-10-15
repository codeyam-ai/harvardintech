// Scenario data for HitDirectoryTeaser's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/HitDirectoryTeaser, every
// other key at /isolated-components/HitDirectoryTeaser/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"HitDirectoryTeaser - <Scenario>","componentName":"HitDirectoryTeaser","url":"/isolated-components/HitDirectoryTeaser/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
export const scenarios: Record<string, Record<string, unknown>> = {
  // The teaser exactly as the WhatsApp band passes it by default.
  Default: {
    title: 'The HIT Directory',
    text: 'Find fellow alumni and ask for an introduction without leaving WhatsApp. Open to every member of the community.',
  },
  // Edge data: a longer title and a two-sentence-plus body, to show the title
  // wrapping in its column and the body staying at reading width beside it.
  LongCopy: {
    title: 'The Harvard Alumni in Tech Directory',
    text: 'Find fellow alumni and ask for an introduction without leaving WhatsApp. Open to every member of the community, in every chapter and online group, wherever you happen to be in the world.',
  },
};

// The homepage `.wrap` content width: 1220px less its 48px gutters.
export const captureWidth: number | undefined = 1124;
