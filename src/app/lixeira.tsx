import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { Stack } from "expo-router";
import {
  Alert,
  Button,
  Empty,
  formatDate,
  IconButton,
  run,
  Screen,
  Sheet,
  usePalette,
} from "@/components/notebook-ui";
import { normalizeSearch, Note, noteText, noteTitle } from "@/data/model";
import { removeNotes, updateNotes, useNotebook } from "@/data/store";

export default function Trash() {
  const { data } = useNotebook();
  const c = usePalette();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Note | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const notes = data.notas
    .filter(
      (note) =>
        note.lixeira &&
        normalizeSearch(noteText(note)).includes(normalizeSearch(search)),
    )
    .sort(
      (a, b) =>
        Date.parse(b.deletedAt || b.data) - Date.parse(a.deletedAt || a.data),
    );
  const restore = (ids: string[]) =>
    run(async () => {
      await updateNotes(ids, { lixeira: false, deletedAt: undefined });
      setPreview(null);
      setSelected([]);
    });
  const remove = (ids: string[]) =>
    Alert.alert(
      "Excluir permanentemente?",
      `${ids.length} nota(s) serão apagadas. Esta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () =>
            run(async () => {
              await removeNotes(ids);
              setPreview(null);
              setSelected([]);
            }),
        },
      ],
    );
  const toggle = (id: string) =>
    setSelected((items) =>
      items.includes(id) ? items.filter((item) => item !== id) : [...items, id],
    );
  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Lixeira",
          headerRight: () => (
            <IconButton
              name="delete-sweep"
              label="Esvaziar toda a lixeira"
              disabled={!data.notas.some((note) => note.lixeira)}
              onPress={() =>
                remove(
                  data.notas
                    .filter((note) => note.lixeira)
                    .map((note) => note.id),
                )
              }
            />
          ),
        }}
      />
      <View style={{ padding: 22, gap: 16 }}>
        <Text style={{ color: c.muted, lineHeight: 22 }}>
          Suas notas ficam aqui até você decidir restaurar ou excluir. Toque
          para ler; segure para selecionar.
        </Text>
        <TextInput
          accessibilityLabel="Pesquisar na lixeira"
          placeholder="Buscar na lixeira"
          placeholderTextColor={c.muted}
          value={search}
          onChangeText={setSearch}
          style={{
            color: c.text,
            backgroundColor: c.surface,
            borderRadius: 14,
            padding: 15,
            borderWidth: 1,
            borderColor: c.line,
          }}
        />
        {selected.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: c.soft,
              borderRadius: 14,
              paddingLeft: 12,
            }}
          >
            <Text style={{ flex: 1, color: c.text }}>
              {selected.length} selecionada(s)
            </Text>
            <IconButton
              name="select-all"
              label="Selecionar todas as notas visíveis"
              onPress={() => setSelected(notes.map((note) => note.id))}
            />
            <IconButton
              name="restore"
              label="Restaurar selecionadas"
              onPress={() => restore(selected)}
            />
            <IconButton
              name="delete-forever"
              label="Excluir selecionadas permanentemente"
              danger
              onPress={() => remove(selected)}
            />
            <IconButton
              name="close"
              label="Cancelar seleção"
              onPress={() => setSelected([])}
            />
          </View>
        )}
      </View>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 30 }}
        ListEmptyComponent={
          <Empty
            title={search ? "Nenhum resultado" : "Tudo em ordem"}
            detail={
              search
                ? "Tente buscar com outras palavras."
                : "As notas excluídas aparecerão aqui."
            }
          />
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Ler ${noteTitle(item)}`}
            accessibilityState={{ selected: selected.includes(item.id) }}
            onLongPress={() => toggle(item.id)}
            onPress={() =>
              selected.length ? toggle(item.id) : setPreview(item)
            }
            style={{
              backgroundColor: selected.includes(item.id) ? c.soft : c.surface,
              borderRadius: 16,
              padding: 18,
              marginBottom: 10,
              borderWidth: 1,
              borderColor: c.line,
            }}
          >
            <Text
              numberOfLines={2}
              style={{ color: c.text, fontSize: 18, fontWeight: "600" }}
            >
              {selected.includes(item.id) ? "✓ " : ""}
              {noteTitle(item)}
            </Text>
            <Text
              numberOfLines={2}
              style={{ color: c.muted, lineHeight: 23, marginTop: 8 }}
            >
              {item.kind === "checklist"
                ? item.items.map((entry) => entry.text).join(" · ")
                : item.texto}
            </Text>
            <Text style={{ color: c.muted, fontSize: 12, marginTop: 12 }}>
              Excluída · {formatDate(item.deletedAt || item.data)}
            </Text>
          </Pressable>
        )}
      />
      <Sheet
        title="Nota na lixeira"
        visible={!!preview}
        onClose={() => setPreview(null)}
      >
        {preview && (
          <View style={{ gap: 18 }}>
            <Text
              selectable
              style={{
                color: c.text,
                fontSize: data.preferences.fontSize,
                lineHeight: data.preferences.fontSize * 1.6,
              }}
            >
              {noteText(preview) || "Nota vazia"}
            </Text>
            <Button onPress={() => restore([preview.id])}>
              Restaurar nota
            </Button>
            <Button danger onPress={() => remove([preview.id])}>
              Excluir permanentemente
            </Button>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
