import { useCallback } from 'react';
import { listCheckins } from '@/db/repo/checkins';
import { listLogbook } from '@/db/repo/logbook';
import { getClient } from '@/db/repo/clients';
import { listExercises } from '@/db/repo/library';
import { useAuthStore } from '@/state/authStore';
import { useAsync } from './useAsync';

/** Bündelt die Abfragen, die der Kundenbereich immer wieder braucht. */

export function useEigeneCheckins() {
  const uid = useAuthStore((s) => s.user?.uid);
  const laden = useCallback(() => (uid ? listCheckins(uid) : Promise.resolve([])), [uid]);
  return useAsync(laden, [uid]);
}

export function useEigenesLogbuch() {
  const uid = useAuthStore((s) => s.user?.uid);
  const laden = useCallback(() => (uid ? listLogbook(uid) : Promise.resolve([])), [uid]);
  return useAsync(laden, [uid]);
}

export function useEigenesProfil() {
  const uid = useAuthStore((s) => s.user?.uid);
  const laden = useCallback(() => (uid ? getClient(uid) : Promise.resolve(null)), [uid]);
  return useAsync(laden, [uid]);
}

export function useUebungsBibliothek() {
  const laden = useCallback(() => listExercises(), []);
  return useAsync(laden, []);
}
