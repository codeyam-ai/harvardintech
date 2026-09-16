// Unit coverage for the SEO/AEO endpoint handlers. The GET functions live in
// `src/pages/*.ts` (Astro endpoints) but are plain functions of an APIContext,
// so they're importable and testable here without the Astro runtime — a test
// file cannot live in `src/pages` itself (Astro would route it). We assert the
// env-driven URL wiring and the settings-derived content, the parts most likely
// to regress (the old static robots.txt shipped a broken placeholder URL).
import { describe, it, expect, vi } from 'vitest';
import { GET as robotsGet } from '../pages/robots.txt';
import { GET as llmsGet } from '../pages/llms.txt';
import { settings } from './site';

// Build a minimal APIContext — the handlers only read `site` and `url`.
function ctx(site: string | undefined, url = 'http://localhost/'): any {
  return { site: site ? new URL(site) : undefined, url: new URL(url) };
}

describe('robots.txt GET', () => {
  // Emits the standard allow-all directives.
  it('allows all crawlers', async () => {
    const body = await (await robotsGet(ctx('https://example.com/'))).text();
    expect(body).toContain('User-agent: *');
    expect(body).toContain('Allow: /');
  });

  // The Sitemap line uses the env-driven site origin, not a literal placeholder.
  it('points the Sitemap at the configured site origin', async () => {
    const body = await (await robotsGet(ctx('https://example.com/'))).text();
    expect(body).toContain('Sitemap: https://example.com/sitemap-index.xml');
    expect(body).not.toContain('<user>');
  });

  // With no configured site, it falls back to the request origin (never crashes).
  it('falls back to the request origin when site is unset', async () => {
    const body = await (await robotsGet(ctx(undefined, 'https://fallback.test/'))).text();
    expect(body).toContain('Sitemap: https://fallback.test/sitemap-index.xml');
  });

  // The Sitemap line names the live domain even from a subpath-hosted build.
  it('points the Sitemap at CANONICAL_ORIGIN when it is set', async () => {
    vi.stubEnv('CANONICAL_ORIGIN', 'https://harvardintech.com');
    try {
      const body = await (await robotsGet(ctx('https://codeyam-ai.github.io/harvardintech/'))).text();
      expect(body).toContain('Sitemap: https://harvardintech.com/sitemap-index.xml');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  // Serves as text/plain so crawlers read it verbatim.
  it('responds as text/plain', async () => {
    const res = await robotsGet(ctx('https://example.com/'));
    expect(res.headers.get('Content-Type')).toContain('text/plain');
  });
});

describe('llms.txt GET', () => {
  // Leads with the org name as an H1 and the description as a blockquote.
  it('includes the org name and description from settings', async () => {
    const body = await (await llmsGet(ctx('https://example.com/'))).text();
    expect(body).toContain(`# ${settings.siteTitle}`);
    expect(body).toContain(settings.description);
  });

  // Key pages are emitted as absolute URLs against the configured origin.
  it('lists key pages as absolute URLs', async () => {
    const body = await (await llmsGet(ctx('https://example.com/'))).text();
    expect(body).toContain('## Key pages');
    expect(body).toContain('[Home](https://example.com/)');
    expect(body).toContain('[Events](https://example.com/events)');
  });

  // The gated preview is hosted on a GitHub Pages subpath, but answer engines
  // must be pointed at the live domain — with no base path attached.
  it('names CANONICAL_ORIGIN, not the preview host, when it is set', async () => {
    vi.stubEnv('CANONICAL_ORIGIN', 'https://harvardintech.com');
    try {
      const body = await (await llmsGet(ctx('https://codeyam-ai.github.io/harvardintech/'))).text();
      expect(body).toContain('[Home](https://harvardintech.com/)');
      expect(body).toContain('[Events](https://harvardintech.com/events)');
      expect(body).not.toContain('github.io');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  // Contact section surfaces the shared inbox (llms.txt is one of the few places
  // it is shown) plus every social link for citation.
  it('surfaces contact email and socials', async () => {
    const saved = settings.contactEmail;
    settings.contactEmail = 'hello@example.com';
    try {
      const body = await (await llmsGet(ctx('https://example.com/'))).text();
      expect(body).toContain('- Email: hello@example.com');
      for (const s of settings.socials) {
        expect(body).toContain(`${s.label}: ${s.url}`);
      }
    } finally {
      settings.contactEmail = saved;
    }
  });

  // A blanked setting drops the Email line and keeps every social.
  it('omits the Email line when the contact email is blank', async () => {
    const saved = settings.contactEmail;
    settings.contactEmail = '';
    try {
      const body = await (await llmsGet(ctx('https://example.com/'))).text();
      expect(body).not.toContain('Email:');
      expect(body).not.toContain('mailto:');
      for (const s of settings.socials) {
        expect(body).toContain(`${s.label}: ${s.url}`);
      }
    } finally {
      settings.contactEmail = saved;
    }
  });
});
