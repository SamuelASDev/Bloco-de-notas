import { router, Stack } from "expo-router";
import { getSharedPayloads, clearSharedPayloads } from "expo-sharing";
import { useState } from "react";
import { Text, View } from "react-native";
import {
  Button,
  Empty,
  run,
  Screen,
  usePalette,
} from "@/components/notebook-ui";
import { newNote } from "@/data/model";
import { saveNote } from "@/data/store";

export default function ReceiveShare() {
  const c = usePalette();
  const [text] = useState(() =>
    getSharedPayloads()
      .filter(
        (payload) =>
          payload.shareType === "text" || payload.shareType === "url",
      )
      .map((payload) => payload.value)
      .join("\n\n"),
  );
  const [busy, setBusy] = useState(false);
  return (
    <Screen>
      <Stack.Screen options={{ title: "Texto compartilhado" }} />
      {text ? (
        <View style={{ padding: 22, gap: 20 }}>
          <Text style={{ color: c.text, fontSize: 22, fontWeight: "600" }}>
            Guardar no seu caderno?
          </Text>
          <Text
            numberOfLines={12}
            selectable
            style={{ color: c.muted, lineHeight: 25, fontSize: 17 }}
          >
            {text}
          </Text>
          <Button
            disabled={busy}
            onPress={() =>
              run(async () => {
                setBusy(true);
                try {
                  const note = { ...newNote(), texto: text };
                  await saveNote(note);
                  clearSharedPayloads();
                  router.replace({
                    pathname: "/nova-nota",
                    params: { id: note.id },
                  });
                } finally {
                  setBusy(false);
                }
              })
            }
          >
            Salvar como nota
          </Button>
          <Button
            secondary
            onPress={() => {
              clearSharedPayloads();
              router.replace("/");
            }}
          >
            Cancelar
          </Button>
        </View>
      ) : (
        <Empty
          title="Nenhum texto recebido"
          detail="Compartilhe um texto ou link de outro aplicativo para guardar como nota."
        >
          <Button onPress={() => router.replace("/")}>Abrir caderno</Button>
        </Empty>
      )}
    </Screen>
  );
}
