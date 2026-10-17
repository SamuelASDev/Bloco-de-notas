import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Clipboard from "expo-clipboard";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
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
  formatDate,
  IconButton,
  MenuRow,
  NameDialog,
  run,
  Screen,
  Sheet,
  usePalette,
} from "@/components/notebook-ui";
import {
  newId,
  normalizeSearch,
  Note,
  noteText,
  noteTitle,
} from "@/data/model";
import {
  changeData,
  setPreferences,
  updateNotes,
  useNotebook,
} from "@/data/store";
import { exportText } from "@/data/files";

export default function Home() {
  const { data } = useNotebook();
  const c = usePalette();
  const [folder, setFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<Note | null>(null);
  const [panel, setPanel] = useState<"folders" | "sort" | "create" | null>(
    null,
  );
  const [nameDialog, setNameDialog] = useState<{
    id?: string;
    name: string;
  } | null>(null);
  const [moving, setMoving] = useState<string[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const activeFolder = data.pastas.find((item) => item.id === folder);
  const notes = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return data.notas
      .filter(
        (note) =>
          !note.lixeira &&
          (folder === "all" || note.pastaId === folder) &&
          normalizeSearch(noteText(note)).includes(query),
      )
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        if (data.preferences.sort === "title")
          return noteTitle(a).localeCompare(noteTitle(b), "pt-BR");
        return (
          Date.parse(
            data.preferences.sort === "created" ? b.createdAt : b.data,
          ) -
          Date.parse(data.preferences.sort === "created" ? a.createdAt : a.data)
        );
      });
  }, [data.notas, data.preferences.sort, search, folder]);
  const trash = (ids: string[]) =>
    run(async () => {
      await updateNotes(ids, {
        lixeira: true,
        deletedAt: new Date().toISOString(),
      });
      setDeleted(ids);
      setSelected([]);
      setMenu(null);
    });
  const toggle = (id: string) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  const create = (kind: "text" | "checklist") => {
    setPanel(null);
    router.push({
      pathname: "/nova-nota",
      params: {
        id: newId(),
        pastaId: folder === "all" ? "padrao" : folder,
        kind,
      },
    });
  };
  const deleteFolder = () => {
    if (!activeFolder) return;
    const id = activeFolder.id;
    const finish = (toTrash: boolean) =>
      run(async () => {
        await changeData((current) => ({
          ...current,
          pastas: current.pastas.filter((item) => item.id !== id),
          notas: current.notas.map((note) =>
            note.pastaId === id
              ? {
                  ...note,
                  pastaId: "padrao",
                  ...(toTrash
                    ? { lixeira: true, deletedAt: new Date().toISOString() }
                    : {}),
                }
              : note,
          ),
        }));
        setFolder("all");
        setPanel(null);
      });
    Alert.alert(
      "Excluir pasta?",
      "Escolha o que fazer com as notas. Nenhuma será apagada permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Manter sem pasta", onPress: () => finish(false) },
        {
          text: "Enviar à lixeira",
          style: "destructive",
          onPress: () => finish(true),
        },
      ],
    );
  };
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Caderno",
          headerRight: () => (
            <View style={{ flexDirection: "row" }}>
              <IconButton
                name="delete-outline"
                label="Abrir lixeira"
                onPress={() => router.push("/lixeira")}
              />
              <IconButton
                name="tune"
                label="Preferências"
                onPress={() => router.push("/configuracoes")}
              />
            </View>
          ),
        }}
      />
      <View style={{ paddingHorizontal: 22, paddingTop: 16, gap: 18 }}>
        <View>
          <Text
            accessibilityRole="header"
            style={{
              color: c.text,
              fontSize: 34,
              fontWeight: "700",
              letterSpacing: -1,
            }}
          >
            {activeFolder?.nome ||
              (folder === "padrao" ? "Sem pasta" : "Suas ideias.")}
          </Text>
          <Text style={{ color: c.muted, marginTop: 6, fontSize: 14 }}>
            {notes.length} {notes.length === 1 ? "nota" : "notas"} · um espaço
            para lembrar
          </Text>
        </View>
        <View
          style={{
            backgroundColor: c.surface,
            borderRadius: 16,
            flexDirection: "row",
            alignItems: "center",
            paddingLeft: 15,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <MaterialIcons name="search" size={22} color={c.muted} />
          <TextInput
            accessibilityLabel="Buscar notas"
            placeholder={
              folder === "all"
                ? "Buscar em todas as notas"
                : "Buscar nesta pasta"
            }
            placeholderTextColor={c.muted}
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, padding: 14, color: c.text, fontSize: 16 }}
          />
          {search !== "" && (
            <IconButton
              name="close"
              label="Limpar busca"
              onPress={() => setSearch("")}
            />
          )}
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setPanel("folders")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              minHeight: 44,
              flexShrink: 1,
            }}
          >
            <MaterialIcons name="folder-open" size={20} color={c.accent} />
            <Text
              numberOfLines={1}
              style={{ color: c.accent, fontWeight: "600", flexShrink: 1 }}
            >
              {activeFolder?.nome ||
                (folder === "padrao" ? "Sem pasta" : "Todas as notas")}
            </Text>
            <MaterialIcons name="expand-more" size={18} color={c.accent} />
          </Pressable>
          <IconButton
            name="sort"
            label="Ordenar notas"
            onPress={() => setPanel("sort")}
          />
        </View>
      </View>
      {selected.length > 0 && (
        <View
          style={{
            marginHorizontal: 22,
            backgroundColor: c.soft,
            borderRadius: 14,
            paddingLeft: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ color: c.text, flex: 1 }}>
            {selected.length} selecionada(s)
          </Text>
          <IconButton
            name="select-all"
            label="Selecionar todas as notas visíveis"
            onPress={() => setSelected(notes.map((note) => note.id))}
          />
          <IconButton
            name="drive-file-move-outline"
            label="Mover selecionadas"
            onPress={() => setMoving(selected)}
          />
          <IconButton
            name="delete-outline"
            label="Excluir selecionadas"
            onPress={() => trash(selected)}
          />
          <IconButton
            name="close"
            label="Cancelar seleção"
            onPress={() => setSelected([])}
          />
        </View>
      )}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: 22,
          paddingTop: 8,
          paddingBottom: 110,
        }}
        ListEmptyComponent={
          <Empty
            title={search ? "Nada por aqui" : "Comece com uma ideia"}
            detail={
              search
                ? "Tente outras palavras ou busque em todas as pastas."
                : "Uma lembrança, uma lista, um pensamento. Guarde o que importa."
            }
          >
            {!search && (
              <Button onPress={() => create("text")}>
                Criar primeira nota
              </Button>
            )}
            {search && folder !== "all" && (
              <Button secondary onPress={() => setFolder("all")}>
                Buscar em todas as pastas
              </Button>
            )}
          </Empty>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${noteTitle(item)}${item.pinned ? ", fixada" : ""}`}
              accessibilityState={{ selected: selected.includes(item.id) }}
              onLongPress={() => toggle(item.id)}
              onPress={() =>
                selected.length
                  ? toggle(item.id)
                  : router.push({
                      pathname: "/nova-nota",
                      params: { id: item.id },
                    })
              }
              style={({ pressed }) => ({
                backgroundColor: selected.includes(item.id)
                  ? c.soft
                  : c.surface,
                padding: 18,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: selected.includes(item.id) ? c.accent : c.line,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingRight: 38,
                  minHeight: 34,
                }}
              >
                {selected.length > 0 && (
                  <MaterialIcons
                    name={
                      selected.includes(item.id)
                        ? "check-circle"
                        : "radio-button-unchecked"
                    }
                    size={21}
                    color={c.accent}
                  />
                )}
                <Text
                  numberOfLines={2}
                  style={{
                    color: c.text,
                    flex: 1,
                    fontSize: 18,
                    lineHeight: 24,
                    fontWeight: "600",
                  }}
                >
                  {noteTitle(item)}
                </Text>
                {item.pinned && (
                  <MaterialIcons name="push-pin" size={15} color={c.accent} />
                )}
              </View>
              <Text
                numberOfLines={2}
                style={{
                  color: c.muted,
                  fontSize: 15,
                  lineHeight: 23,
                  marginTop: 4,
                }}
              >
                {item.kind === "checklist"
                  ? item.items
                      .slice(0, 3)
                      .map((entry) => `${entry.done ? "✓" : "○"} ${entry.text}`)
                      .join("\n") || "Lista vazia"
                  : item.title
                    ? item.texto || "Sem conteúdo"
                    : item.texto.split("\n").slice(1).join("\n") ||
                      "Toque para continuar escrevendo"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginTop: 14,
                }}
              >
                <Text style={{ color: c.muted, fontSize: 12 }}>
                  {item.kind === "checklist"
                    ? `${item.items.filter((entry) => entry.done).length}/${item.items.length} concluídos`
                    : data.pastas.find((entry) => entry.id === item.pastaId)
                        ?.nome || "Nota"}
                </Text>
                <Text style={{ color: c.muted, fontSize: 12 }}>
                  {formatDate(item.data)}
                </Text>
              </View>
            </Pressable>
            <View style={{ position: "absolute", top: 10, right: 6 }}>
              <IconButton
                name="more-horiz"
                label={`Opções de ${noteTitle(item)}`}
                onPress={() => setMenu(item)}
              />
            </View>
          </View>
        )}
      />
      {deleted.length > 0 && (
        <View
          style={{
            position: "absolute",
            bottom: 94,
            left: 22,
            right: 22,
            backgroundColor: c.soft,
            borderRadius: 16,
            paddingLeft: 16,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Text style={{ flex: 1, color: c.text }}>Enviado à lixeira</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              run(async () => {
                await updateNotes(deleted, {
                  lixeira: false,
                  deletedAt: undefined,
                });
                setDeleted([]);
              })
            }
            style={{ padding: 16 }}
          >
            <Text style={{ color: c.accent, fontWeight: "600" }}>Desfazer</Text>
          </Pressable>
          <IconButton
            name="close"
            label="Fechar aviso"
            onPress={() => setDeleted([])}
          />
        </View>
      )}
      <View style={{ position: "absolute", bottom: 22, right: 22 }}>
        <Button onPress={() => setPanel("create")}>＋ Nova nota</Button>
      </View>
      <Sheet
        title="Criar"
        visible={panel === "create"}
        onClose={() => setPanel(null)}
      >
        <MenuRow
          label="Nota de texto"
          detail="Escreva com liberdade."
          icon="notes"
          onPress={() => create("text")}
        />
        <MenuRow
          label="Checklist"
          detail="Uma coisa de cada vez."
          icon="checklist"
          onPress={() => create("checklist")}
        />
      </Sheet>
      <Sheet
        title="Organizar"
        visible={panel === "folders"}
        onClose={() => setPanel(null)}
      >
        {[
          { id: "all", nome: "Todas as notas" },
          { id: "padrao", nome: "Sem pasta" },
          ...data.pastas,
        ].map((item) => (
          <MenuRow
            key={item.id}
            label={item.nome}
            icon={folder === item.id ? "check" : "folder-open"}
            onPress={() => {
              setFolder(item.id);
              setSelected([]);
              setPanel(null);
            }}
          />
        ))}
        <MenuRow
          label="Nova pasta"
          icon="create-new-folder"
          onPress={() => {
            setPanel(null);
            setNameDialog({ name: "" });
          }}
        />
        {activeFolder && (
          <>
            <MenuRow
              label="Renomear esta pasta"
              icon="edit"
              onPress={() => {
                setPanel(null);
                setNameDialog({ id: activeFolder.id, name: activeFolder.nome });
              }}
            />
            <MenuRow
              label="Excluir esta pasta"
              icon="delete-outline"
              danger
              onPress={deleteFolder}
            />
          </>
        )}
      </Sheet>
      <Sheet
        title="Ordenar por"
        visible={panel === "sort"}
        onClose={() => setPanel(null)}
      >
        {(
          [
            { id: "updated", label: "Última edição" },
            { id: "created", label: "Data de criação" },
            { id: "title", label: "Título" },
          ] as const
        ).map((item) => (
          <MenuRow
            key={item.id}
            label={item.label}
            icon={data.preferences.sort === item.id ? "check" : "sort"}
            onPress={() =>
              run(async () => {
                await setPreferences({ sort: item.id });
                setPanel(null);
              })
            }
          />
        ))}
      </Sheet>
      <Sheet
        title="Opções da nota"
        visible={menu !== null}
        onClose={() => setMenu(null)}
      >
        {menu && (
          <>
            <MenuRow
              label={menu.pinned ? "Desafixar" : "Fixar no topo"}
              icon="push-pin"
              onPress={() =>
                run(async () => {
                  await updateNotes([menu.id], { pinned: !menu.pinned });
                  setMenu(null);
                })
              }
            />
            <MenuRow
              label="Selecionar"
              icon="check-circle-outline"
              onPress={() => {
                setSelected([menu.id]);
                setMenu(null);
              }}
            />
            <MenuRow
              label="Mover"
              icon="drive-file-move-outline"
              onPress={() => {
                setMoving([menu.id]);
                setMenu(null);
              }}
            />
            <MenuRow
              label="Copiar"
              icon="content-copy"
              onPress={() =>
                run(async () => {
                  await Clipboard.setStringAsync(noteText(menu));
                  setMenu(null);
                })
              }
            />
            <MenuRow
              label="Compartilhar"
              icon="ios-share"
              onPress={() =>
                run(async () => {
                  await Share.share({ message: noteText(menu) });
                  setMenu(null);
                })
              }
            />
            <MenuRow
              label="Exportar .txt"
              icon="file-download"
              onPress={() => run(() => exportText(menu))}
            />
            <MenuRow
              label="Enviar à lixeira"
              icon="delete-outline"
              danger
              onPress={() => trash([menu.id])}
            />
          </>
        )}
      </Sheet>
      <FolderPicker
        visible={moving.length > 0}
        onClose={() => setMoving([])}
        onPick={(id) => {
          const ids = [...moving];
          run(async () => {
            await updateNotes(ids, { pastaId: id });
            setSelected([]);
          });
        }}
      />
      {nameDialog && (
        <NameDialog
          key={nameDialog.id || "new"}
          title={nameDialog.id ? "Renomear pasta" : "Nova pasta"}
          initial={nameDialog.name}
          visible
          onClose={() => setNameDialog(null)}
          onSubmit={(name) =>
            changeData((current) => {
              if (
                current.pastas.some(
                  (item) =>
                    item.id !== nameDialog.id &&
                    normalizeSearch(item.nome) === normalizeSearch(name),
                )
              )
                throw new Error("Já existe uma pasta com esse nome.");
              return {
                ...current,
                pastas: nameDialog.id
                  ? current.pastas.map((item) =>
                      item.id === nameDialog.id
                        ? { ...item, nome: name }
                        : item,
                    )
                  : [...current.pastas, { id: newId(), nome: name }],
              };
            })
          }
        />
      )}
    </Screen>
  );
}
