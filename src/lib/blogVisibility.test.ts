import { describe, it, expect } from 'vitest';
import { BLOG_ENABLED, isBlogChannel } from './blogVisibility';

// The blog is hidden for launch (owner decision, 2026-09-14) but not removed —
// the ten Medium stubs keep building at their own URLs. What is hidden is every
// route INTO the blog. These tests pin the switch and the rule that decides
// which Content Hub channels count as such a route.
describe('BLOG_ENABLED', () => {
  // A deliberate assertion on the shipped value, not a tautology: this is the
  // switch that decides whether the launch site shows a blog at all, so flipping
  // it should be a conscious act that fails a test until the test is updated
  // alongside the nav entry and the index it needs.
  it('is off, so the launch site offers no way into the blog', () => {
    expect(BLOG_ENABLED).toBe(false);
  });
});

describe('isBlogChannel', () => {
  // The index the blog gets when it returns.
  it('matches the blog index path', () => {
    expect(isBlogChannel('/blog')).toBe(true);
    expect(isBlogChannel('/blog/')).toBe(true);
  });

  // Today's Content Hub card points at a single post rather than an index.
  it('matches a path to an individual post', () => {
    expect(isBlogChannel('/blog/welcome')).toBe(true);
    expect(isBlogChannel('/blog/spotlight-charlie-cheever')).toBe(true);
  });

  // The reason this matches on the PATH and not the label: `channels` is a
  // CMS-editable prop, so an editor can rename the Blog card to anything. A
  // label-based rule would silently stop hiding it the moment they did.
  it('is unaffected by what the channel is labelled', () => {
    expect(isBlogChannel('/blog/welcome')).toBe(true);
  });

  // The other three channels must survive — hiding the blog must not empty the
  // Content Hub.
  it('does not match the other channels', () => {
    expect(isBlogChannel('https://medium.com/harvard-in-tech')).toBe(false);
    expect(isBlogChannel('https://www.linkedin.com/company/harvardintech/')).toBe(false);
    expect(isBlogChannel('/events/')).toBe(false);
    expect(isBlogChannel('/#content')).toBe(false);
  });

  // A prefix check on the bare string would swallow any future route whose name
  // merely starts with "blog" — the boundary is the path segment.
  it('does not match a different route that merely starts with the same letters', () => {
    expect(isBlogChannel('/blogroll')).toBe(false);
    expect(isBlogChannel('/blogging-guide')).toBe(false);
  });

  // Medium is where the writing actually lives, and it is the channel the hidden
  // blog hands its readers to — matching it would hide that too.
  it('does not match an external URL that contains the word blog', () => {
    expect(isBlogChannel('https://example.com/blog/post')).toBe(false);
  });
});
