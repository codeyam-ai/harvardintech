// The name a social link is shown under on the Contact band.
//
// Twitter is now X, but `settings.json` (and every scenario seed) still carries
// the label "Twitter". Rather than asking an editor to retype it, a label that
// is exactly "Twitter" or "X" reads under the name the network has now, with the
// old one in brackets so nobody wonders where Twitter went. Anything else —
// including a longer label that merely contains the word — passes through
// untouched. Extracted from `ContactUs.astro` so the rule is unit-testable.

export function socialDisplayLabel(label: string): string {
  return /^(twitter|x)$/i.test(label.trim()) ? 'X (Twitter)' : label;
}
