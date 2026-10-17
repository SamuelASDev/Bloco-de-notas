const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const ts = require("typescript");
const path = require("node:path");
function load(file, dependencies = {}) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require, module, exports) { ${code}\n})`, {
    filename: file,
  })((id) => dependencies[id] || require(id), module, module.exports);
  return module.exports;
}
const model = load("src/data/model.ts");
test('widget registration does not load a missing native module in Expo Go', () => {
  load('src/widgets/register.android.tsx', { 'react-native': { TurboModuleRegistry: { get: () => null } } });
  let loaded = false;
  const dependencies = { 'react-native': { TurboModuleRegistry: { get: () => ({}) } } };
  Object.defineProperty(dependencies, './task', { get() { loaded = true; return {}; } });
  load('src/widgets/register.android.tsx', dependencies);
  assert.equal(loaded, true);
});
function setup(seed = {}) {
  const values = new Map(Object.entries(seed));
  const writes = [];
  let fail = false;
  const storage = {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async multiGet(keys) {
      return keys.map((key) => [key, values.get(key) ?? null]);
    },
    async setItem(key, value) {
      // Deliberately delayed to exercise overlapping callers and the write queue.
      await new Promise((resolve) =>
        setTimeout(resolve, writes.length % 2 ? 1 : 5),
      );
      if (fail) throw new Error("disk full");
      values.set(key, value);
      writes.push({ key, value });
    },
  };
  const store = load("src/data/store.ts", {
    "./model": model,
    "@react-native-async-storage/async-storage": storage,
    react: { useSyncExternalStore: (_, get) => get() },
  });
  return {
    store,
    values,
    writes,
    fail(value) {
      fail = value;
    },
  };
}
test("legacy notes are migrated without changing their IDs or original storage", async () => {
  const legacy = [
    { id: "old", texto: "Minha nota", data: "2026-01-01T00:00:00.000Z" },
  ];
  const { store, values } = setup({ notas: JSON.stringify(legacy) });
  await store.loadData();
  assert.equal(store.snapshot().notas[0].id, "old");
  assert.equal(store.snapshot().notas[0].pastaId, "padrao");
  assert.equal(values.get("notas"), JSON.stringify(legacy));
  assert.equal(JSON.parse(values.get("notebook:v2")).version, 2);
});
test("malformed backup records, duplicate IDs and orphaned folders are rejected", () => {
  const note = { ...model.newNote(), texto: "texto" };
  for (const notas of [
    [{ ...note, texto: null }],
    [note, note],
    [{ ...note, pastaId: "missing" }],
    [{ ...note, data: "bad" }],
    [{ ...note, lixeira: "yes" }],
    [{ ...note, items: [{ id: "a", text: 4, done: false }] }],
  ]) {
    assert.throws(() => model.parseBackup({ notas, pastas: [] }));
  }
  assert.throws(() =>
    model.parseBackup({ version: 99, notas: [], pastas: [] }),
  );
});
test("overlapping edits preserve the most recent contents and edits to other notes", async () => {
  const { store, values } = setup();
  await store.loadData();
  const a = model.newNote();
  const b = model.newNote();
  await Promise.all([
    store.saveNote({ ...a, texto: "a1" }),
    store.saveNote({ ...b, texto: "b1" }),
    store.saveNote({ ...a, texto: "a2" }),
  ]);
  const saved = JSON.parse(values.get("notebook:v2"));
  assert.equal(saved.notas.find((note) => note.id === a.id).texto, "a2");
  assert.equal(saved.notas.find((note) => note.id === b.id).texto, "b1");
  assert.equal(store.useNotebook().pending, 0);
});
test("a queued edit cannot resurrect a subsequently trashed note", async () => {
  const { store, values } = setup();
  await store.loadData();
  const note = { ...model.newNote(), texto: "keep me" };
  await Promise.all([
    store.saveNote(note),
    store.updateNotes([note.id], { lixeira: true }),
  ]);
  assert.equal(JSON.parse(values.get("notebook:v2")).notas[0].lixeira, true);
});
test("failed writes remain recoverable in memory and can be retried", async () => {
  const { store, values, fail } = setup();
  await store.loadData();
  fail(true);
  const note = { ...model.newNote(), texto: "não perder" };
  await assert.rejects(store.saveNote(note));
  assert.ok(store.useNotebook().error);
  assert.equal(store.snapshot().notas[0].texto, note.texto);
  fail(false);
  await store.retrySave();
  assert.equal(store.useNotebook().error, null);
  assert.equal(
    JSON.parse(values.get("notebook:v2")).notas[0].texto,
    note.texto,
  );
});
test("unreadable stored data is preserved and writes are blocked", async () => {
  const { store, values, writes } = setup({ "notebook:v2": "{broken" });
  await store.loadData();
  assert.equal(store.useNotebook().loadError, true);
  await assert.rejects(store.saveNote(model.newNote()));
  assert.equal(values.get("notebook:v2"), "{broken");
  assert.equal(writes.length, 0);
});
test("replacement creates a recovery copy and restoring it swaps the datasets", async () => {
  const { store, values } = setup();
  await store.loadData();
  const original = { ...model.newNote(), texto: "original" };
  await store.saveNote(original);
  const imported = {
    ...model.emptyData(),
    notas: [{ ...model.newNote(), texto: "imported" }],
  };
  await store.restoreBackup(imported, "replace");
  assert.equal(
    JSON.parse(values.get("notebook:recovery")).notas[0].texto,
    "original",
  );
  assert.equal(store.snapshot().notas[0].texto, "imported");
  await store.restoreRecovery();
  assert.equal(store.snapshot().notas[0].texto, "original");
  assert.equal(
    JSON.parse(values.get("notebook:recovery")).notas[0].texto,
    "imported",
  );
});
test("replacement is blocked if its recovery snapshot cannot be saved", async () => {
  const { store, fail } = setup();
  await store.loadData();
  await store.saveNote({ ...model.newNote(), texto: "original" });
  fail(true);
  await assert.rejects(store.restoreBackup(model.emptyData(), "replace"));
  assert.equal(store.snapshot().notas[0].texto, "original");
});
test("merge preserves ID collisions as copies and maps folders correctly", () => {
  const note = { ...model.newNote(), texto: "original", pastaId: "one" };
  const current = {
    ...model.emptyData(),
    notas: [note],
    pastas: [{ id: "one", nome: "Trabalho" }],
  };
  const incoming = {
    ...model.emptyData(),
    notas: [{ ...note, texto: "imported", pastaId: "two" }],
    pastas: [{ id: "two", nome: "trabalho" }],
  };
  const result = model.mergeData(current, incoming);
  assert.equal(result.notas.length, 2);
  assert.notEqual(result.notas[0].id, result.notas[1].id);
  assert.equal(result.pastas.length, 1);
  assert.equal(result.notas[1].pastaId, "one");
  assert.equal(current.notas.length, 1);
});
test("emptying an existing note preserves it; backup round trip includes history and checklists", async () => {
  const { store } = setup();
  await store.loadData();
  const note = {
    ...model.newNote("padrao", "checklist"),
    texto: "texto",
    items: [{ id: "a", text: "Comprar pão", done: true }],
    history: [
      {
        id: "rev",
        text: "antes",
        title: "",
        items: [],
        date: new Date().toISOString(),
      },
    ],
  };
  await store.saveNote(note);
  await store.saveNote({ ...note, texto: "" });
  assert.equal(store.snapshot().notas.length, 1);
  const roundTrip = model.parseBackup(
    JSON.parse(JSON.stringify(store.snapshot())),
  );
  assert.equal(roundTrip.notas[0].items[0].done, true);
  assert.equal(roundTrip.notas[0].history[0].text, "antes");
  assert.equal(model.normalizeSearch("PÃO"), model.normalizeSearch("pao"));
});
