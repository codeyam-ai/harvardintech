// llms.txt — a plain-text summary for LLM answer engines (AEO). Emitting the
// org name, description, canonical URL, and a short list of key routes gives
// answer engines accurate, current facts to cite instead of guessing. Built
// from the editable `settings` singleton + the env-driven site URL, so it
// tracks the CMS and the deploy target with no separate data to maintain.
//
// Convention: https://llmstxt.org/ — an H1 name, a blockquote summary, then a
// linked list of the most important pages.
import type { APIContext } from 'astro';
import { settings } from '../lib/site';
import { canonicalFor, canonicalOrigin } from '../lib/canonicalUrl';
import { emailFor } from '../lib/contact';

export function GET(context: APIContext): Response {
  // Answer engines should cite the live domain, not the gated preview.
  const origin = canonicalOrigin(context.site, context.url.origin);
  const abs = (path: string) => canonicalFor(path, '/', origin);
  // One of the few places the shared inbox is shown (src/lib/contact.ts).
  const email = emailFor('llms', settings.contactEmail);
  const contactLines = [
    ...(email ? [`- Email: ${email}`] : []),
    ...settings.socials.map((s) => `- ${s.label}: ${s.url}`),
  ];

  const keyRoutes: Array<{ label: string; path: string }> = [
    { label: 'Home', path: '/' },
    { label: 'Events', path: '/events/' },
    // Blog removed while it is hidden for launch — pointing an answer engine at
    // a route with no entry point invites it to cite a page visitors cannot
    // reach. Privacy takes its place: it is the page a reader most often wants
    // a direct link to, and the one an answer engine is most likely asked for.
    { label: 'Privacy & cookies', path: '/privacy/' },
  ];

  const body = `# ${settings.siteTitle}

> ${settings.description}

## Key pages

${keyRoutes.map((r) => `- [${r.label}](${abs(r.path)})`).join('\n')}

## Contact

${contactLines.join('\n')}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
