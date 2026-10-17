export type ChecklistItem = { id: string; text: string; done: boolean };
export type Revision = {
  id: string;
  text: string;
  title: string;
  items: ChecklistItem[];
  date: string;
};
export type Note = {
  id: string;
  texto: string;
  title: string;
  data: string;
  createdAt: string;
  pastaId: string;
  lixeira: boolean;
  pinned: boolean;
  kind: "text" | "checklist";
  items: ChecklistItem[];
  history: Revision[];
  deletedAt?: string;
};
export type Folder = { id: string; nome: string };
export type Preferences = {
  theme: "system" | "light" | "dark";
  fontSize: number;
  sort: "updated" | "created" | "title";
};
export type Data = {
  version: 2;
  notas: Note[];
  pastas: Folder[];
  preferences: Preferences;
};
export const defaults: Preferences = {
  theme: "system",
  fontSize: 18,
  sort: "updated",
};
export const emptyData = (): Data => ({
  version: 2,
  notas: [],
  pastas: [],
  preferences: { ...defaults },
});
export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export const newNote = (
  pastaId = "padrao",
  kind: Note["kind"] = "text",
): Note => {
  const date = new Date().toISOString();
  return {
    id: newId(),
    title: "",
    texto: "",
    data: date,
    createdAt: date,
    pastaId,
    kind,
    pinned: false,
    lixeira: false,
    items: [],
    history: [],
  };
};
export const noteTitle = (note: Note) =>
  note.title.trim() ||
  note.texto
    .split("\n")
    .find((line) => line.trim())
    ?.trim() ||
  (note.kind === "checklist" ? "Lista sem título" : "Nota sem título");
export const noteText = (note: Note) =>
  [
    note.title,
    note.texto,
    ...note.items.map((item) => `${item.done ? "[x]" : "[ ]"} ${item.text}`),
  ]
    .filter(Boolean)
    .join("\n");
export const hasContent = (note: Note) =>
  !!(
    note.title.trim() ||
    note.texto.trim() ||
    note.items.some((item) => item.text.trim())
  );
export const normalizeSearch = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Registro inválido no backup.");
  return value as Record<string, unknown>;
}
function string(value: unknown, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== "string")
    throw new Error("O backup contém um campo de texto inválido.");
  return value;
}
function date(value: unknown, fallback?: string) {
  const text = string(value, fallback);
  if (!Number.isFinite(Date.parse(text)))
    throw new Error("O backup contém uma data inválida.");
  return text;
}
function bool(value: unknown, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean")
    throw new Error("O backup contém uma opção inválida.");
  return value;
}
function unique<T extends { id: string }>(items: T[]) {
  if (
    items.some((item) => !item.id.trim()) ||
    new Set(items.map((item) => item.id)).size !== items.length
  )
    throw new Error("O backup contém identificadores vazios ou duplicados.");
  return items;
}
function parseItems(value: unknown): ChecklistItem[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error("Checklist inválido.");
  return unique(
    value.map((entry) => {
      const item = record(entry);
      return {
        id: string(item.id),
        text: string(item.text),
        done: bool(item.done),
      };
    }),
  );
}
export function parseBackup(value: unknown): Data {
  const root = record(value);
  if (root.version !== undefined && root.version !== 2)
    throw new Error("Versão de backup não suportada.");
  if (!Array.isArray(root.notas) || !Array.isArray(root.pastas))
    throw new Error("Selecione um backup válido do Bloco de Notas.");
  const pastas = unique(
    root.pastas.map((entry) => {
      const folder = record(entry);
      return { id: string(folder.id), nome: string(folder.nome) };
    }),
  );
  if (pastas.some((folder) => folder.id === "padrao" || !folder.nome.trim()))
    throw new Error("O backup contém uma pasta inválida.");
  const folders = new Set(["padrao", ...pastas.map((folder) => folder.id)]);
  const now = new Date().toISOString();
  const notas = unique(
    root.notas.map((entry) => {
      const note = record(entry);
      const pastaId = string(note.pastaId, "padrao");
      if (!folders.has(pastaId))
        throw new Error("Uma nota aponta para uma pasta que não existe.");
      if (
        note.kind !== undefined &&
        note.kind !== "text" &&
        note.kind !== "checklist"
      )
        throw new Error("Tipo de nota inválido.");
      if (note.history !== undefined && !Array.isArray(note.history))
        throw new Error("Histórico inválido.");
      const history = unique(
        ((note.history || []) as unknown[]).map((entry) => {
          const rev = record(entry);
          return {
            id: string(rev.id),
            text: string(rev.text),
            title: string(rev.title, ""),
            date: date(rev.date),
            items: parseItems(rev.items),
          };
        }),
      ).slice(0, 20);
      return {
        id: string(note.id),
        texto: string(note.texto),
        title: string(note.title, ""),
        data: date(note.data, now),
        createdAt: date(note.createdAt, date(note.data, now)),
        pastaId,
        lixeira: bool(note.lixeira),
        pinned: bool(note.pinned),
        kind: (note.kind || "text") as Note["kind"],
        items: parseItems(note.items),
        history,
        ...(note.deletedAt === undefined
          ? {}
          : { deletedAt: date(note.deletedAt) }),
      };
    }),
  );
  const preferences = { ...defaults };
  if (root.preferences !== undefined) {
    const p = record(root.preferences);
    if (p.theme === "system" || p.theme === "light" || p.theme === "dark")
      preferences.theme = p.theme;
    if (typeof p.fontSize === "number" && p.fontSize >= 14 && p.fontSize <= 28)
      preferences.fontSize = p.fontSize;
    if (p.sort === "updated" || p.sort === "created" || p.sort === "title")
      preferences.sort = p.sort;
  }
  return { version: 2, notas, pastas, preferences };
}

// Imported collisions are kept as separate notes; no existing content is overwritten.
export function mergeData(current: Data, incoming: Data): Data {
  const folderMap = new Map<string, string>([["padrao", "padrao"]]);
  const pastas = [...current.pastas];
  for (const folder of incoming.pastas) {
    const existing = pastas.find(
      (item) =>
        normalizeSearch(item.nome.trim()) ===
        normalizeSearch(folder.nome.trim()),
    );
    const id = existing?.id || newId();
    folderMap.set(folder.id, id);
    if (!existing) pastas.push({ ...folder, id });
  }
  const ids = new Set(current.notas.map((note) => note.id));
  const notas = incoming.notas.map((note) => ({
    ...note,
    id: ids.has(note.id) ? newId() : note.id,
    pastaId: folderMap.get(note.pastaId) || "padrao",
  }));
  return { ...current, pastas, notas: [...current.notas, ...notas] };
}
