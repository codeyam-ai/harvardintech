// Scenario data for LeadCommitteeGrid's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/LeadCommitteeGrid, every
// other key at /isolated-components/LeadCommitteeGrid/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"LeadCommitteeGrid - <Scenario>","componentName":"LeadCommitteeGrid","url":"/isolated-components/LeadCommitteeGrid/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
//
// The people are fixtures, not real committee members. Each carries a different
// mix of optional fields so every line's present and absent branch is shown.
export const scenarios: Record<string, Record<string, unknown>> = {
  Default: {
    members: [
      { name: 'Priya Natarajan', role: 'Committee member', title: 'Product Manager', company: 'Atlas Pay', school: 'HBS', degree: 'MBA', gradYear: 2021, linkedin: 'https://www.linkedin.com/' },
      { name: 'Tom Whitfield', role: 'Committee member', title: 'Partner', company: 'Greyline Ventures' },
      { name: 'Sofia Marquez', role: 'Committee member', school: 'Harvard Law School', degree: 'JD', gradYear: 2017 },
    ],
  },
};

// The leads block sits in the page's narrow column (`.wrap--narrow`, 760px).
export const captureWidth: number | undefined = 760;
