// The stacked month/day/year column used by the landing-page event rows.
//
// The implementation moved to `src/lib/dates.ts`, which is now the site's only
// date formatter; this module stays as the name the event components already
// import, so the move is not a rename across every call site. See `dates.ts`
// for why the formatting is pinned to UTC and en-US.
export type { DateParts as EventDateParts } from './dates';
export { dateParts as eventDateParts } from './dates';
