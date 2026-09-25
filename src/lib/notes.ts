import { z } from 'zod';

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function sanitizeNoteText(value: string) {
  return value.normalize('NFKC').replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim();
}

export function sanitizeNoteBody(value: string) {
  return value.normalize('NFKC').replace(CONTROL_CHARS, '').trim();
}

const uuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'Invalid id.',
  );

export const noteInputSchema = z.object({
  title: z
    .string()
    .transform(sanitizeNoteText)
    .pipe(z.string().min(1, 'Add a title.').max(120, 'Title must be 120 characters or fewer.')),
  body: z
    .string()
    .transform(sanitizeNoteBody)
    .pipe(z.string().max(4000, 'Note must be 4000 characters or fewer.')),
});

export const noteSchema = z.object({
  id: uuidSchema,
  user_id: uuidSchema,
  title: z.string().min(1).max(120),
  body: z.string().max(4000),
  created_at: z.string(),
  updated_at: z.string(),
  deleted_at: z.string().nullable(),
});

export type NoteInput = z.infer<typeof noteInputSchema>;
export type Note = z.infer<typeof noteSchema>;

export function createNoteId() {
  const bytes = new Uint8Array(16);
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) cryptoApi.getRandomValues(bytes);
  else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function noteFieldErrors(error: z.ZodError) {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
