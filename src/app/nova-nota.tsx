import {
  usePreventRemove,
  useHeaderHeight,
} from "expo-router/react-navigation";
import {
  router,
  Stack,
  useLocalSearchParams,
  useNavigation,
} from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Alert,
  Button,
  Empty,
  FolderPicker,
  IconButton,
  MenuRow,
  reportError,
  run,
  Screen,
  Sheet,
  usePalette,
} from "@/components/notebook-ui";
import {
  hasContent,
  newId,
  newNote,
  Note,
  noteText,
  Revision,
} from "@/data/model";
import {
  flushWrites,
  saveNote,
  snapshot,
  updateNotes,
  useNotebook,
} from "@/data/store";
import { exportText } from "@/data/files";

type Content = Pick<Note, "title" | "texto" | "items">;
const content = (note: Note): Content => ({
  title: note.title,
  texto: note.texto,
  items: note.items.map((item) => ({ ...item })),
});
export default function EditorRoute() {
  const params = useLocalSearchParams<{
    id?: string;
    pastaId?: string;
    kind?: string;
  }>();
  return (
    <Editor
      key={params.id || "new"}
      id={params.id}
      folder={params.pastaId}
      kind={params.kind}
    />
  );
}
function Editor({
  id,
  folder,
  kind,
}: {
  id?: string;
  folder?: string;
  kind?: string;
}) {
  const { data, pending, error } = useNotebook();
  const existing = data.notas.find((note) => note.id === id);
  const [initial] = useState(
    () =>
      existing || {
        ...newNote(folder, kind === "checklist" ? "checklist" : "text"),
        ...(id ? { id } : {}),
      },
  );
  const [note, setNote] = useState(initial);
  const current = useRef(note);
  const persisted = useRef(JSON.stringify(initial));
  const [dirty, setDirty] = useState(false);
  const [menu, setMenu] = useState(false);
  const [moving, setMoving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preview, setPreview] = useState<Revision | null>(null);
  const [undo, setUndo] = useState<Content[]>([]);
  const [redo, setRedo] = useState<Content[]>([]);
  const checkpoint = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);
  const input = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);
  const c = usePalette();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const missing = !existing && !folder && !kind;
  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    if (stopped.current) return;
    const value = current.current;
    if (
      !hasContent(value) &&
      !snapshot().notas.some((item) => item.id === value.id)
    ) {
      setDirty(false);
      return;
    }
    const serialized = JSON.stringify(value);
    if (serialized !== persisted.current) {
      await saveNote(value);
      persisted.current = serialized;
      if (JSON.stringify(current.current) === serialized) setDirty(false);
    }
    await flushWrites();
  }, []);
  const commit = (next: Note, addUndo = true) => {
    if (addUndo) {
      setUndo((stack) => [...stack.slice(-49), content(current.current)]);
      setRedo([]);
    }
    if (!checkpoint.current && hasContent(initial)) {
      next = {
        ...next,
        history: [
          {
            id: newId(),
            text: initial.texto,
            title: initial.title,
            items: initial.items,
            date: initial.data,
          },
          ...next.history,
        ].slice(0, 20),
      };
      checkpoint.current = true;
    }
    next = { ...next, data: new Date().toISOString() };
    current.current = next;
    setNote(next);
    setDirty(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void flush().catch(() => {});
    }, 350);
  };
  useEffect(() => {
    // Bound the unsaved window even during continuous typing without a pause.
    const periodicSave = setInterval(() => {
      void flush().catch(() => {});
    }, 2000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void flush().catch(() => {});
    });
    return () => {
      clearInterval(periodicSave);
      subscription.remove();
      if (timer.current) clearTimeout(timer.current);
      void flush().catch(() => {});
    };
  }, [flush]);
  usePreventRemove(dirty || pending > 0 || !!error, ({ data: event }) => {
    void flush()
      .then(() => navigation.dispatch(event.action))
      .catch(reportError);
  });
  const before = (action: () => Promise<unknown>) =>
    run(async () => {
      await flush();
      await action();
    });
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };
  if (missing)
    return (
      <Screen>
        <Empty
          title="Nota não encontrada"
          detail="Ela pode ter sido removida ou substituída por um backup."
        >
          <Button onPress={goBack}>Voltar às notas</Button>
        </Empty>
      </Screen>
    );
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <View style={{ flexDirection: "row" }}>
              <IconButton
                name={note.pinned ? "push-pin" : "push-pin"}
                label={note.pinned ? "Desafixar nota" : "Fixar nota"}
                onPress={() =>
                  commit(
                    { ...current.current, pinned: !current.current.pinned },
                    false,
                  )
                }
              />
              <IconButton
                name="more-horiz"
                label="Opções da nota"
                onPress={() => setMenu(true)}
              />
            </View>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={headerHeight}
      >
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 22,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ color: c.accent, fontSize: 12 }}>
            {data.pastas.find((item) => item.id === note.pastaId)?.nome ||
              "Sem pasta"}
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: error ? c.danger : c.muted, fontSize: 12 }}
          >
            {error
              ? "Falha ao salvar"
              : dirty || pending
                ? "Salvando…"
                : "Salvo no dispositivo"}
          </Text>
        </View>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: 22,
            paddingBottom: 60,
            flexGrow: 1,
          }}
        >
          <TextInput
            accessibilityLabel="Título da nota"
            placeholder="Título"
            placeholderTextColor={c.muted}
            value={note.title}
            multiline
            onChangeText={(title) => commit({ ...current.current, title })}
            style={{
              color: c.text,
              fontSize: 30,
              lineHeight: 38,
              fontWeight: "600",
              padding: 0,
              marginBottom: 22,
            }}
          />
          {note.kind === "text" ? (
            <TextInput
              ref={input}
              accessibilityLabel="Conteúdo da nota"
              multiline
              autoFocus={!hasContent(initial)}
              textAlignVertical="top"
              placeholder="Deixe suas ideias aqui…"
              placeholderTextColor={c.muted}
              value={note.texto}
              onChangeText={(texto) => commit({ ...current.current, texto })}
              style={{
                color: c.text,
                fontSize: data.preferences.fontSize,
                lineHeight: data.preferences.fontSize * 1.65,
                minHeight: 300,
                flex: 1,
                padding: 0,
              }}
            />
          ) : (
            <View style={{ gap: 4 }}>
              {note.items.map((item, index) => (
                <View
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderBottomWidth: 1,
                    borderBottomColor: c.line,
                  }}
                >
                  <IconButton
                    name={item.done ? "check-circle" : "radio-button-unchecked"}
                    label={
                      item.done
                        ? "Marcar como pendente"
                        : "Marcar como concluído"
                    }
                    onPress={() =>
                      commit({
                        ...current.current,
                        items: current.current.items.map((entry) =>
                          entry.id === item.id
                            ? { ...entry, done: !entry.done }
                            : entry,
                        ),
                      })
                    }
                  />
                  <TextInput
                    accessibilityLabel={`Item ${index + 1}`}
                    placeholder="O que fazer?"
                    placeholderTextColor={c.muted}
                    value={item.text}
                    multiline
                    onChangeText={(text) =>
                      commit({
                        ...current.current,
                        items: current.current.items.map((entry) =>
                          entry.id === item.id ? { ...entry, text } : entry,
                        ),
                      })
                    }
                    style={{
                      color: item.done ? c.muted : c.text,
                      textDecorationLine: item.done ? "line-through" : "none",
                      fontSize: data.preferences.fontSize,
                      flex: 1,
                      paddingVertical: 12,
                    }}
                  />
                  <IconButton
                    name="close"
                    label={`Remover item ${index + 1}`}
                    onPress={() =>
                      commit({
                        ...current.current,
                        items: current.current.items.filter(
                          (entry) => entry.id !== item.id,
                        ),
                      })
                    }
                  />
                </View>
              ))}
              <MenuRow
                label="Adicionar item"
                icon="add"
                onPress={() =>
                  commit({
                    ...current.current,
                    items: [
                      ...current.current.items,
                      { id: newId(), text: "", done: false },
                    ],
                  })
                }
              />
            </View>
          )}
        </ScrollView>
        <View
          style={{
            borderTopWidth: 1,
            borderColor: c.line,
            paddingHorizontal: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <IconButton
            name="undo"
            label="Desfazer"
            disabled={!undo.length}
            onPress={() => {
              const previous = undo[undo.length - 1];
              setRedo((stack) => [...stack, content(current.current)]);
              setUndo((stack) => stack.slice(0, -1));
              commit({ ...current.current, ...previous }, false);
            }}
          />
          <IconButton
            name="redo"
            label="Refazer"
            disabled={!redo.length}
            onPress={() => {
              const next = redo[redo.length - 1];
              setUndo((stack) => [...stack, content(current.current)]);
              setRedo((stack) => stack.slice(0, -1));
              commit({ ...current.current, ...next }, false);
            }}
          />
          <Text
            style={{
              color: c.muted,
              fontSize: 12,
              marginLeft: "auto",
              paddingRight: 10,
            }}
          >
            {note.kind === "text"
              ? `${note.texto.trim() ? note.texto.trim().split(/\s+/).length : 0} palavras`
              : `${note.items.filter((item) => item.done).length} de ${note.items.length} concluídos`}
          </Text>
        </View>
      </KeyboardAvoidingView>
      <Sheet title="Sua nota" visible={menu} onClose={() => setMenu(false)}>
        <MenuRow
          label="Mover para outra pasta"
          icon="drive-file-move-outline"
          onPress={() => {
            setMenu(false);
            setMoving(true);
          }}
        />
        <MenuRow
          label="Compartilhar texto"
          icon="ios-share"
          onPress={() =>
            before(() => Share.share({ message: noteText(current.current) }))
          }
        />
        <MenuRow
          label="Exportar .txt"
          icon="file-download"
          onPress={() => before(() => exportText(current.current))}
        />
        <MenuRow
          label="Histórico de versões"
          detail="Até 20 versões de sessões anteriores."
          icon="history"
          onPress={() => {
            setMenu(false);
            setHistoryOpen(true);
          }}
        />
        <MenuRow
          label="Descartar alterações desta sessão"
          icon="restore"
          onPress={() =>
            Alert.alert(
              "Restaurar o início da sessão?",
              "O conteúdo voltará ao estado em que você abriu esta nota.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Restaurar",
                  onPress: () => {
                    commit({ ...current.current, ...content(initial) });
                    setMenu(false);
                  },
                },
              ],
            )
          }
        />
        {note.kind === "text" && (
          <MenuRow
            label="Ir para o final"
            icon="vertical-align-bottom"
            onPress={() => {
              setMenu(false);
              requestAnimationFrame(() => {
                input.current?.focus();
                input.current?.setNativeProps({
                  selection: {
                    start: current.current.texto.length,
                    end: current.current.texto.length,
                  },
                });
                scroll.current?.scrollToEnd({ animated: true });
              });
            }}
          />
        )}
        <MenuRow
          label="Enviar à lixeira"
          icon="delete-outline"
          danger
          onPress={() =>
            before(async () => {
              await updateNotes([note.id], {
                lixeira: true,
                deletedAt: new Date().toISOString(),
              });
              stopped.current = true;
              setMenu(false);
              setDirty(false);
              goBack();
            })
          }
        />
      </Sheet>
      <FolderPicker
        visible={moving}
        onClose={() => setMoving(false)}
        onPick={(pastaId) => {
          commit({ ...current.current, pastaId }, false);
          run(flush);
        }}
      />
      <Sheet
        title="Versões anteriores"
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
      >
        {note.history.length ? (
          note.history.map((revision) => (
            <MenuRow
              key={revision.id}
              label={new Date(revision.date).toLocaleString("pt-BR")}
              detail={
                revision.title || revision.text.slice(0, 100) || "Checklist"
              }
              icon="history"
              onPress={() => {
                setHistoryOpen(false);
                setPreview(revision);
              }}
            />
          ))
        ) : (
          <Text style={{ color: c.muted, paddingVertical: 20 }}>
            Ao editar uma nota existente, a versão anterior fica guardada aqui.
          </Text>
        )}
      </Sheet>
      <Sheet
        title="Prévia da versão"
        visible={!!preview}
        onClose={() => setPreview(null)}
      >
        {preview && (
          <View style={{ gap: 18 }}>
            <Text
              selectable
              style={{ color: c.text, fontSize: 17, lineHeight: 26 }}
            >
              {[
                preview.title,
                preview.text,
                ...preview.items.map(
                  (item) => `${item.done ? "✓" : "○"} ${item.text}`,
                ),
              ]
                .filter(Boolean)
                .join("\n")}
            </Text>
            <Button
              onPress={() => {
                const previous = current.current;
                commit({
                  ...previous,
                  title: preview.title,
                  texto: preview.text,
                  items: preview.items,
                  history: [
                    {
                      id: newId(),
                      title: previous.title,
                      text: previous.texto,
                      items: previous.items,
                      date: previous.data,
                    },
                    ...previous.history,
                  ].slice(0, 20),
                });
                setPreview(null);
              }}
            >
              Restaurar esta versão
            </Button>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
