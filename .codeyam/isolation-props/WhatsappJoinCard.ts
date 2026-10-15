// Scenario data for WhatsappJoinCard's isolation pages. It lives here, under
// `.codeyam/`, rather than in the app's source tree — anything under the app's
// source tree ships with the app. The pages that render it are generated and
// gitignored; `codeyam-editor editor isolate --all` rebuilds them from this file.
//
// One page per key: `Default` is served at /isolated-components/WhatsappJoinCard, every
// other key at /isolated-components/WhatsappJoinCard/<Scenario>. Register each with:
//   codeyam-editor editor register '{"name":"WhatsappJoinCard - <Scenario>","componentName":"WhatsappJoinCard","url":"/isolated-components/WhatsappJoinCard/<Scenario>","dimensions":["Desktop"]}'
// The state matrix reads each scenario's props from this map, so a scenario
// registered against one of these URLs needs no hand-written demonstratesState.
//
// SEED data that exercises the component — populate lists with realistic rows,
// fill optional fields. All-empty props render an empty shell and is a bug; put
// empty / loading / error in their own keys.
export const scenarios: Record<string, Record<string, unknown>> = {
  // The live destinations: the alumni-verification form and the admissions
  // criteria doc (`WHATSAPP_FORM_URL` / `WHATSAPP_CRITERIA_URL`).
  Default: {
    verifyUrl: 'https://forms.gle/GqgaCDDWhWAgpJC68',
    criteriaUrl:
      'https://docs.google.com/document/d/1IvWhYTdFqOzMYg6ySXx7pmMOfwhDwDHfXHdDkZRbkyE/edit?tab=t.0#heading=h.2l2z5vqeznos',
  },
};

// The homepage `.wrap` content width: 1220px less its 48px gutters.
export const captureWidth: number | undefined = 1124;
