// The upload half of "image uploads in the content editor", tested against the
// @codeyam/cms code we depend on (patched locally — see "The patch on top of the
// package" in CMS_SETUP.md).
//
// The editor-visible bug: uploading from a field's picker seemed to do nothing.
// The upload staged, but the picker waited for a second click on the new
// thumbnail, and that thumbnail pointed at `/images/...` — a file that does not
// exist until publish — so it rendered broken. Editors read that as a failed
// upload and uploaded again, which is where the byte-identical `-2` copies in
// `813e3b9` and `75d884d` came from.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent, waitFor, screen } from '@testing-library/react';
import { stageUpload, imageSrc } from '@codeyam/cms/lib/mediaStaging';
import { loadChanges, stageChange } from '@codeyam/cms/lib/pendingChangesStore';
import { withBase } from '@codeyam/cms/lib/adminUrl';
import MediaPickerModal from '@codeyam/cms/components/admin/MediaPickerModal.tsx';
import type { PendingChange } from '@codeyam/cms/lib/pendingChanges';

const EMPTY = { assets: [] };

function svgFile(name: string, body = '<svg xmlns="http://www.w3.org/2000/svg"/>'): File {
  return new File([body], name, { type: 'image/svg+xml' });
}

const stagedImages = () => loadChanges().filter((c) => c.encoding === 'base64');

beforeEach(() => {
  window.localStorage.clear();
});

describe('stageUpload', () => {
  // The duplicate-copy reproduction: the same bytes uploaded twice must hand
  // back the first upload's record rather than filing `logo-2.svg` beside it.
  it('reuses the staged record for a byte-identical repeat upload', async () => {
    const first = await stageUpload(svgFile('logo.svg'), EMPTY, EMPTY);
    const again = await stageUpload(svgFile('logo.svg'), EMPTY, EMPTY);

    expect(again.filename).toBe(first.filename);
    expect(stagedImages().map((c) => c.path)).toEqual(['public/images/logo.svg']);
  });

  // Different bytes under the same name are a genuinely new image and still get
  // their own de-duplicated filename.
  it('still files a different image under a fresh name', async () => {
    await stageUpload(svgFile('logo.svg'), EMPTY, EMPTY);
    const other = await stageUpload(svgFile('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'), EMPTY, EMPTY);

    expect(other.filename).toBe('logo-2.svg');
    expect(stagedImages()).toHaveLength(2);
  });
});

describe('imageSrc', () => {
  // A staged upload has no file on the site yet, so its thumbnail shows the
  // staged bytes inline instead of a broken `/images/...` link.
  it('serves a staged upload as a data URI', () => {
    stageChange({
      collection: 'media',
      slug: 'logo.svg',
      path: 'public/images/logo.svg',
      title: 'logo.svg',
      original: '',
      updated: 'PHN2Zy8+',
      kind: 'edit',
      encoding: 'base64',
    } as PendingChange);

    expect(imageSrc('/images/logo.svg')).toBe('data:image/svg+xml;base64,PHN2Zy8+');
  });

  // A published image loads from the site exactly as before.
  it('loads an unstaged image from the site', () => {
    expect(imageSrc('/images/team/peter-boyce.png')).toBe(withBase('/images/team/peter-boyce.png'));
  });

  // External urls are left as written.
  it('leaves an external url alone', () => {
    expect(imageSrc('https://example.com/a.png')).toBe('https://example.com/a.png');
  });
});

describe('MediaPickerModal upload', () => {
  const upload = (container: HTMLElement, files: File[]) =>
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files } });

  // A single upload IS the picker's choice — it selects without a second click.
  it('selects a single uploaded image straight away', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <MediaPickerModal library={EMPTY} committed={EMPTY} onSelect={onSelect} onClose={() => {}} />,
    );

    upload(container, [svgFile('logo.svg')]);

    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onSelect.mock.calls[0][0].filename).toBe('logo.svg');
  });

  // Several files can't all be the one choice, so the picker says what to do next.
  it('asks the editor to pick after a multi-file upload', async () => {
    const onSelect = vi.fn();
    const { container } = render(
      <MediaPickerModal library={EMPTY} committed={EMPTY} onSelect={onSelect} onClose={() => {}} />,
    );

    upload(container, [svgFile('a.svg'), svgFile('b.svg', '<svg xmlns="http://www.w3.org/2000/svg"><g/></svg>')]);

    expect((await screen.findByRole('status')).textContent).toBe('2 images uploaded — click a photo to use it.');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
