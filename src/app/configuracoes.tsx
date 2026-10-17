import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import {
  Alert,
  Button,
  IconButton,
  MenuRow,
  run,
  Screen,
  Sheet,
  usePalette,
} from "@/components/notebook-ui";
import { Data } from "@/data/model";
import { exportBackup, pickBackup } from "@/data/files";
import {
  flushWrites,
  readRecovery,
  restoreBackup,
  restoreRecovery,
  setPreferences,
  snapshot,
  useNotebook,
} from "@/data/store";

export default function Settings() {
  const { data } = useNotebook();
  const c = usePalette();
  const [incoming, setIncoming] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRecovery, setShowRecovery] = useState<Data | null>(null);
  const task = (action: () => Promise<unknown>) =>
    run(async () => {
      setBusy(true);
      try {
        await action();
      } finally {
        setBusy(false);
      }
    });
  const restore = (mode: "merge" | "replace") => {
    if (!incoming) return;
    const imported = incoming;
    const execute = () =>
      task(async () => {
        await restoreBackup(imported, mode);
        setIncoming(null);
        Alert.alert(
          "Tudo pronto",
          mode === "merge"
            ? "As notas foram adicionadas. IDs em conflito foram preservados como cópias."
            : "Backup restaurado. A versão anterior está na cópia de recuperação.",
        );
      });
    if (mode === "replace")
      Alert.alert(
        "Substituir suas notas?",
        "As notas e pastas atuais serão substituídas. Uma cópia de recuperação será salva antes da troca.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Substituir", style: "destructive", onPress: execute },
        ],
      );
    else execute();
  };
  const heading = (text: string) => (
    <Text
      accessibilityRole="header"
      style={{
        color: c.muted,
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 1.5,
        marginTop: 28,
        marginBottom: 12,
      }}
    >
      {text}
    </Text>
  );
  return (
    <Screen>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
      >
        <Text
          style={{
            color: c.text,
            fontSize: 30,
            fontWeight: "600",
            marginTop: 16,
          }}
        >
          Do seu jeito.
        </Text>
        <Text style={{ color: c.muted, marginTop: 8, lineHeight: 22 }}>
          Um caderno tranquilo para o dia a dia.
        </Text>
        {heading("APARÊNCIA")}
        <View style={{ gap: 8 }}>
          {(
            [
              { id: "system", label: "Acompanhar o sistema" },
              { id: "light", label: "Tema claro" },
              { id: "dark", label: "Tema escuro" },
            ] as const
          ).map((item) => (
            <MenuRow
              key={item.id}
              icon={
                data.preferences.theme === item.id
                  ? "radio-button-checked"
                  : "radio-button-unchecked"
              }
              label={item.label}
              onPress={() => run(() => setPreferences({ theme: item.id }))}
            />
          ))}
        </View>
        {heading("LEITURA")}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: c.surface,
            padding: 12,
            borderRadius: 16,
          }}
        >
          <Text style={{ color: c.text }}>Tamanho do texto</Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <IconButton
              name="remove"
              label="Diminuir fonte"
              disabled={data.preferences.fontSize <= 14}
              onPress={() =>
                run(() =>
                  setPreferences({ fontSize: data.preferences.fontSize - 2 }),
                )
              }
            />
            <Text style={{ color: c.text, minWidth: 28, textAlign: "center" }}>
              {data.preferences.fontSize}
            </Text>
            <IconButton
              name="add"
              label="Aumentar fonte"
              disabled={data.preferences.fontSize >= 28}
              onPress={() =>
                run(() =>
                  setPreferences({ fontSize: data.preferences.fontSize + 2 }),
                )
              }
            />
          </View>
        </View>
        <Text
          style={{
            fontSize: data.preferences.fontSize,
            lineHeight: data.preferences.fontSize * 1.6,
            color: c.muted,
            marginTop: 16,
          }}
        >
          Mais espaço para suas ideias.
        </Text>
        {heading("SEUS DADOS")}
        <View
          style={{
            backgroundColor: c.surface,
            padding: 18,
            borderRadius: 18,
            gap: 14,
          }}
        >
          <Text style={{ color: c.text, fontSize: 17, fontWeight: "600" }}>
            Leve suas notas com você
          </Text>
          <Text style={{ color: c.muted, lineHeight: 23 }}>
            As notas ficam neste dispositivo. Exporte uma cópia para guardar em
            um local seguro ou levar para outro celular. O arquivo inclui a
            lixeira e o histórico das notas.
          </Text>
          <Button
            disabled={busy}
            onPress={() =>
              task(async () => {
                await flushWrites();
                await exportBackup(snapshot());
              })
            }
          >
            {busy ? "Aguarde…" : "Exportar backup"}
          </Button>
          <Button
            disabled={busy}
            secondary
            onPress={() =>
              task(async () => {
                const backup = await pickBackup();
                if (backup) setIncoming(backup);
              })
            }
          >
            Importar backup
          </Button>
        </View>
        <MenuRow
          label="Recuperar dados anteriores à importação"
          detail="Uma cópia local é guardada antes de cada importação."
          icon="restore"
          onPress={() =>
            task(async () => {
              const recovery = await readRecovery();
              if (!recovery)
                Alert.alert(
                  "Nenhuma cópia disponível",
                  "Uma cópia será criada quando você importar um backup.",
                );
              else setShowRecovery(recovery);
            })
          }
        />
      </ScrollView>
      <Sheet
        title="Importar backup"
        visible={!!incoming}
        onClose={() => {
          if (!busy) setIncoming(null);
        }}
      >
        {incoming && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: c.text, lineHeight: 24 }}>
              {incoming.notas.filter((note) => !note.lixeira).length} notas
              ativas · {incoming.notas.filter((note) => note.lixeira).length} na
              lixeira · {incoming.pastas.length} pastas
            </Text>
            <Text style={{ color: c.muted, lineHeight: 22 }}>
              Mesclar mantém suas notas atuais e adiciona as importadas.
              Importar o mesmo arquivo novamente pode criar cópias.
            </Text>
            <Button disabled={busy} onPress={() => restore("merge")}>
              Mesclar com minhas notas
            </Button>
            <Button disabled={busy} danger onPress={() => restore("replace")}>
              Substituir tudo
            </Button>
          </View>
        )}
      </Sheet>
      <Sheet
        title="Cópia de recuperação"
        visible={!!showRecovery}
        onClose={() => {
          if (!busy) setShowRecovery(null);
        }}
      >
        {showRecovery && (
          <View style={{ gap: 16 }}>
            <Text style={{ color: c.text, lineHeight: 24 }}>
              {showRecovery.notas.length} notas · {showRecovery.pastas.length}{" "}
              pastas
            </Text>
            <Text style={{ color: c.muted, lineHeight: 22 }}>
              Você pode exportar esta cópia ou substituir os dados atuais. Ao
              restaurar, os dados atuais passam a ser a nova cópia de
              recuperação.
            </Text>
            <Button
              disabled={busy}
              secondary
              onPress={() => task(() => exportBackup(showRecovery))}
            >
              Exportar esta cópia
            </Button>
            <Button
              disabled={busy}
              onPress={() =>
                Alert.alert(
                  "Restaurar cópia?",
                  "Suas notas atuais serão substituídas e guardadas como cópia de recuperação.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Restaurar",
                      onPress: () =>
                        task(async () => {
                          await restoreRecovery();
                          setShowRecovery(null);
                        }),
                    },
                  ],
                )
              }
            >
              Restaurar esta cópia
            </Button>
          </View>
        )}
      </Sheet>
    </Screen>
  );
}
