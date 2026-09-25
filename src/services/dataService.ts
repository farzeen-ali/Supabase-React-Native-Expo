import { noteInputSchema, noteSchema, type Note, type NoteInput } from '@/lib/notes';
import { supabase } from '@/lib/supabase';

export class DataServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataServiceError';
  }
}

function fail(message: string): never {
  throw new DataServiceError(message);
}

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) fail('Sign in again to change your notes.');
  return data.user.id;
}

function parseNote(row: unknown): Note {
  const parsed = noteSchema.safeParse(row);
  if (!parsed.success) fail('The server returned a note this app cannot display.');
  return parsed.data;
}

export async function getItems(): Promise<Note[]> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('notes')
    .select('id, user_id, title, body, created_at, updated_at, deleted_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) fail(error.message);
  return (data ?? []).map(parseNote);
}

export async function createItem(input: NoteInput, id: string): Promise<Note> {
  const payload = noteInputSchema.parse(input);
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('notes')
    .insert({
      id,
      user_id: userId,
      title: payload.title,
      body: payload.body,
    })
    .select('id, user_id, title, body, created_at, updated_at, deleted_at')
    .single();

  if (error) fail(error.message);
  return parseNote(data);
}

export async function updateItem(id: string, input: NoteInput): Promise<Note> {
  const payload = noteInputSchema.parse(input);
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('notes')
    .update({
      title: payload.title,
      body: payload.body,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .select('id, user_id, title, body, created_at, updated_at, deleted_at')
    .single();

  if (error) fail(error.message);
  return parseNote(data);
}

export async function deleteItem(id: string): Promise<void> {
  const userId = await currentUserId();
  const deletedAt = new Date().toISOString();
  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: deletedAt, updated_at: deletedAt })
    .eq('id', id)
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) fail(error.message);
}

export async function restoreItem(id: string): Promise<Note> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from('notes')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id, user_id, title, body, created_at, updated_at, deleted_at')
    .single();

  if (error) fail(error.message);
  return parseNote(data);
}

export async function purgeItem(id: string): Promise<void> {
  const userId = await currentUserId();
  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
  if (error) fail(error.message);
}
