import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import {
  Data,
  emptyData,
  mergeData,
  Note,
  parseBackup,
  Preferences,
} from "./model";

const KEY = "notebook:v2";
const RECOVERY = "notebook:recovery";
type State = {
  data: Data;
  ready: boolean;
  pending: number;
  error: string | null;
  loadError: boolean;
};
let state: State = {
  data: emptyData(),
  ready: false,
  pending: 0,
  error: null,
  loadError: false,
};
const listeners = new Set<() => void>();
let queue: Promise<void> = Promise.resolve();
let loading: Promise<void> | undefined;
function publish(patch: Partial<State>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function useNotebook() {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}

export function loadData(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const saved = await AsyncStorage.getItem(KEY);
      let data: Data;
      if (saved) data = parseBackup(JSON.parse(saved));
      else {
        const legacy = await AsyncStorage.multiGet(["notas", "pastas"]);
        data = parseBackup({
          notas: JSON.parse(legacy[0][1] || "[]"),
          pastas: JSON.parse(legacy[1][1] || "[]"),
        });
        await AsyncStorage.setItem(KEY, JSON.stringify(data));
      }
      publish({ data, ready: true, error: null, loadError: false });
    } catch {
      publish({
        ready: true,
        error:
          "Não foi possível abrir suas notas. Seus dados foram preservados.",
        loadError: true,
      });
      loading = undefined;
    }
  })();
  return loading;
}

function persist(data: Data): Promise<void> {
  publish({ data, pending: state.pending + 1 });
  const serialized = JSON.stringify(data);
  const operation = queue.then(async () => {
    try {
      await AsyncStorage.setItem(KEY, serialized);
      publish({ error: null });
    } catch {
      publish({
        error: "Há alterações que ainda não foram salvas. Tente novamente.",
      });
      throw new Error("Não foi possível salvar suas alterações.");
    } finally {
      publish({ pending: state.pending - 1 });
    }
  });
  queue = operation.catch(() => {});
  return operation;
}
export async function changeData(update: (data: Data) => Data) {
  if (!state.ready || state.loadError)
    throw new Error("As notas ainda não estão disponíveis.");
  return persist(update(state.data));
}
export async function retrySave() {
  if (state.loadError) return loadData();
  return persist(state.data);
}
export function saveNote(note: Note) {
  return changeData((data) => ({
    ...data,
    notas: [note, ...data.notas.filter((item) => item.id !== note.id)],
  }));
}
export function updateNotes(ids: string[], patch: Partial<Note>) {
  const selected = new Set(ids);
  return changeData((data) => ({
    ...data,
    notas: data.notas.map((note) =>
      selected.has(note.id) ? { ...note, ...patch } : note,
    ),
  }));
}
export function removeNotes(ids: string[]) {
  const selected = new Set(ids);
  return changeData((data) => ({
    ...data,
    notas: data.notas.filter((note) => !selected.has(note.id)),
  }));
}
export function setPreferences(patch: Partial<Preferences>) {
  return changeData((data) => ({
    ...data,
    preferences: { ...data.preferences, ...patch },
  }));
}
export async function restoreBackup(incoming: Data, mode: "merge" | "replace") {
  await queue;
  // A separate durable snapshot must succeed before any destructive replacement.
  await AsyncStorage.setItem(RECOVERY, JSON.stringify(state.data));
  const next =
    mode === "merge"
      ? mergeData(state.data, incoming)
      : { ...incoming, preferences: state.data.preferences };
  await persist(next);
}
export async function readRecovery() {
  const saved = await AsyncStorage.getItem(RECOVERY);
  return saved ? parseBackup(JSON.parse(saved)) : null;
}
export async function restoreRecovery() {
  const recovery = await readRecovery();
  if (!recovery) throw new Error("Nenhuma cópia de recuperação disponível.");
  await restoreBackup(recovery, "replace");
}
export function snapshot() {
  return state.data;
}
export async function flushWrites() {
  await queue;
  if (state.error) throw new Error(state.error);
}
