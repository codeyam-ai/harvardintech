// One chapter or community lead, as both collections store it. Defined once so
// the `chapters` and `communities` schemas and every component that renders a
// lead share the same shape instead of three hand-written `Lead` interfaces.
//
// Only `name` is required: the entries that predate profiles are `{ name, role }`
// (some with a `photo`) and must keep validating and rendering. Everything else
// is what Nicole asked for across her 4 Aug and 21 Oct notes — title and
// company, school, degree and class year, LinkedIn, email and a short bio.
// `role` stays free text ("Chapter Lead", "Co-Lead", "Committee member"); the
// component reads "committee" out of it to decide which leads get the compact
// grid rather than a full profile.
import { z } from 'astro/zod';

export const leadSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  photo: z.string().optional(),
  title: z.string().optional(),
  company: z.string().optional(),
  school: z.string().optional(),
  degree: z.string().optional(),
  gradYear: z.number().optional(),
  linkedin: z.string().optional(),
  email: z.string().optional(),
  bio: z.string().optional(),
});

export type Lead = z.infer<typeof leadSchema>;
