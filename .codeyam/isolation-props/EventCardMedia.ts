// Scenario data for EventCardMedia's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/EventCardMedia, every
// other key at /isolated-components/EventCardMedia/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"EventCardMedia - <Scenario>","componentName":"EventCardMedia","url":"/isolated-components/EventCardMedia/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
export const scenarios: Record<string, Record<string, unknown>> = {
  // A real Luma cover (the Leaders in Engineering panel), square with its own
  // title text, resized through Luma's CDN to card size.
  Default: {
    coverImage:
      'https://images.lumacdn.com/event-covers/51/3ca64ff6-0259-40c1-81e4-e39e2de5b300.png',
  },
  // No cover: the H mark on crimson fills the same square.
  NoCover: {},
};

// One event card's width in the /events grid (280px tracks).
export const captureWidth: number | undefined = 280;
