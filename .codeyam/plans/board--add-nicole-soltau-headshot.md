---
title: "board -- Add Nicole Soltau's headshot"
mode: ui
createdAt: "2026-11-16T23:05:00Z"
prefix: "board"
source: manual
---

## Summary

Nicole Soltau (Director of Marketing) went live on the Board of Directors on 2026-11-16 without a photo, so her tile shows an "NS" initials circle. When the owner supplies her headshot, replace the initials with the photo, styled like the other five directors.

**Blocked on:** the owner sending the photo file (drop it into the chat, or upload it through /admin → Team → Nicole Soltau → Photo).

## Key Decisions

- Match the existing headshots exactly: a circular cutout on a white background, greyscale, PNG, the face centred and filling the same share of the frame as `public/images/team/ben-wei.png` (the visible circle is ~82% of the square image). Same pixel size as the other team PNGs.
- File name `public/images/team/nicole-soltau.png`, following the `<first>-<last>.png` convention.
- Add a media-library entry with alt text in the same style as the other directors' (see `src/data/media.json`).
- No layout change: the board is already one row of six with round tiles (`BoardOfDirectors.astro`, `BoardMemberTile.astro`).

## Implementation

1. Process the supplied image into `public/images/team/nicole-soltau.png` (crop square around the face, circular mask on white, greyscale, resize to match the others).
2. In `src/content/team/nicole-soltau.md` add `photo: /images/team/nicole-soltau.png`.
3. In `src/lib/team.photos.test.ts` remove `nicole-soltau.md` from `PHOTO_PENDING`, so the headshot test now covers her (non-empty photo, file exists).
4. Add the `media.json` alt-text entry.
5. Recapture the board scenarios (homepage board band, board tiles) and check the six circles read as one consistent row at desktop, iPad and phone widths.

## Verification

- `npx vitest run src/lib/team.photos.test.ts` passes with Nicole included.
- The homepage board on harvardintech.com shows six photo circles of matching size, with no initials tile.
