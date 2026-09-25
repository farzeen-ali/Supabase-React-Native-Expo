import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createNoteId, noteSchema, type Note, type NoteInput } from '@/lib/notes';
import { supabase } from '@/lib/supabase';
import {
  createItem,
  deleteItem,
  getItems,
  purgeItem,
  restoreItem,
  updateItem,
} from '@/services/dataService';

type PendingUndo = {
  note: Note;
};

function sortNotes(items: Note[]) {
  return [...items].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

function upsert(items: Note[], note: Note) {
  const next = items.filter((item) => item.id !== note.id);
  if (note.deleted_at) return next;
  return sortNotes([note, ...next]);
}

export function useCrudData(userId: string | undefined) {
  const [items, setItems] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [undo, setUndo] = useState<PendingUndo | null>(null);
  const itemsRef = useRef(items);
  const mutationLock = useRef(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const refresh = useCallback(async (mode: 'initial' | 'pull' = 'initial') => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    if (mode === 'pull') setRefreshing(true);
    else setLoading(true);
    try {
      const next = await getItems();
      setItems(next);
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load notes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh('initial');
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`notes:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const id = (payload.old as { id?: string }).id;
            if (!id) return;
            setItems((current) => current.filter((item) => item.id !== id));
            return;
          }
          const parsed = noteSchema.safeParse(payload.new);
          if (!parsed.success) return;
          setItems((current) => upsert(current, parsed.data));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const runLocked = useCallback(async (task: () => Promise<void>) => {
    if (mutationLock.current) return false;
    mutationLock.current = true;
    try {
      await task();
      return true;
    } finally {
      mutationLock.current = false;
    }
  }, []);

  const createNote = useCallback(
    async (input: NoteInput) => {
      if (!userId) return;
      const id = createNoteId();
      const now = new Date().toISOString();
      const optimistic: Note = {
        id,
        user_id: userId,
        title: input.title,
        body: input.body,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      const snapshot = itemsRef.current;
      setItems((current) => upsert(current, optimistic));
      setError(null);
      const started = await runLocked(async () => {
        try {
          const saved = await createItem(input, id);
          setItems((current) => upsert(current, saved));
        } catch (caught) {
          setItems(snapshot);
          setError(caught instanceof Error ? caught.message : 'Could not create the note.');
          throw caught;
        }
      });
      if (!started) {
        setItems(snapshot);
        throw new Error('Please wait for the current save to finish.');
      }
    },
    [runLocked, userId],
  );

  const updateNote = useCallback(
    async (id: string, input: NoteInput) => {
      const snapshot = itemsRef.current;
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, title: input.title, body: input.body, updated_at: new Date().toISOString() }
            : item,
        ),
      );
      setError(null);
      const started = await runLocked(async () => {
        try {
          const saved = await updateItem(id, input);
          setItems((current) => upsert(current, saved));
        } catch (caught) {
          setItems(snapshot);
          setError(caught instanceof Error ? caught.message : 'Could not update the note.');
          throw caught;
        }
      });
      if (!started) {
        setItems(snapshot);
        throw new Error('Please wait for the current save to finish.');
      }
    },
    [runLocked],
  );

  const removeNote = useCallback(
    async (id: string) => {
      const snapshot = itemsRef.current;
      const target = snapshot.find((item) => item.id === id);
      if (!target) return;
      setItems((current) => current.filter((item) => item.id !== id));
      setUndo({ note: target });
      setError(null);
      const started = await runLocked(async () => {
        try {
          await deleteItem(id);
        } catch (caught) {
          setItems(snapshot);
          setUndo(null);
          setError(caught instanceof Error ? caught.message : 'Could not delete the note.');
        }
      });
      if (!started) {
        setItems(snapshot);
        setUndo(null);
      }
    },
    [runLocked],
  );

  const undoDelete = useCallback(async () => {
    if (!undo) return;
    const note = undo.note;
    setItems((current) => upsert(current, { ...note, deleted_at: null }));
    setUndo(null);
    try {
      const saved = await restoreItem(note.id);
      setItems((current) => upsert(current, saved));
    } catch (caught) {
      setItems((current) => current.filter((item) => item.id !== note.id));
      setError(caught instanceof Error ? caught.message : 'Could not restore the note.');
    }
  }, [undo]);

  const purgeNote = useCallback(
    async (id: string) => {
      const snapshot = itemsRef.current;
      setItems((current) => current.filter((item) => item.id !== id));
      setUndo(null);
      try {
        await purgeItem(id);
      } catch (caught) {
        setItems(snapshot);
        setError(caught instanceof Error ? caught.message : 'Could not purge the note.');
      }
    },
    [],
  );

  const visibleItems = useMemo(() => {
    if (!debouncedQuery) return items;
    return items.filter((item) => {
      const haystack = `${item.title} ${item.body}`.toLowerCase();
      return haystack.includes(debouncedQuery);
    });
  }, [debouncedQuery, items]);

  return {
    items: visibleItems,
    loading,
    refreshing,
    error,
    setError,
    query,
    setQuery,
    refresh,
    createNote,
    updateNote,
    removeNote,
    purgeNote,
    undo,
    undoDelete,
  };
}
