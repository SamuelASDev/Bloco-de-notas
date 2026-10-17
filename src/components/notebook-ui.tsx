import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { PropsWithChildren, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNotebook } from "@/data/store";
import { Alert, closeDialog, getDialog, subscribeDialog } from "@/data/dialog";
export { Alert } from "@/data/dialog";

export function DialogHost() {
  const dialog = useSyncExternalStore(subscribeDialog, getDialog, () => null);
  const c = usePalette();
  return (
    <Sheet visible={!!dialog} title={dialog?.title || ""} onClose={closeDialog}>
      {dialog && (
        <View style={{ gap: 14 }}>
          <Text style={{ color: c.muted, fontSize: 16, lineHeight: 25 }}>
            {dialog.message}
          </Text>
          {dialog.buttons.map((button, index) => (
            <Button
              key={index}
              secondary={button.style === "cancel"}
              danger={button.style === "destructive"}
              onPress={() => {
                closeDialog();
                button.onPress?.();
              }}
            >
              {button.text || "Entendi"}
            </Button>
          ))}
        </View>
      )}
    </Sheet>
  );
}

const light = {
  bg: "#F8F7F4",
  surface: "#FFFFFF",
  text: "#222824",
  muted: "#70796F",
  line: "#E3E6DF",
  accent: "#356649",
  soft: "#E8EFE6",
  danger: "#AC403B",
};
const dark = {
  bg: "#151A17",
  surface: "#202722",
  text: "#E8EDE7",
  muted: "#A2ADA1",
  line: "#354036",
  accent: "#A3CEAC",
  soft: "#2D4031",
  danger: "#F2A09A",
};
export function usePalette() {
  const { data } = useNotebook();
  const system = useColorScheme();
  const isDark =
    data.preferences.theme === "dark" ||
    (data.preferences.theme === "system" && system === "dark");
  return { ...(isDark ? dark : light), isDark };
}
export const reportError = (error: unknown) =>
  Alert.alert(
    "Não foi possível concluir",
    error instanceof Error ? error.message : "Tente novamente.",
  );
export function run(action: () => Promise<unknown>) {
  void action().catch(reportError);
}
export function Screen({ children }: PropsWithChildren) {
  const c = usePalette();
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      style={{ flex: 1, backgroundColor: c.bg }}
    >
      <View
        style={{ flex: 1, width: "100%", maxWidth: 820, alignSelf: "center" }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
export function IconButton({
  name,
  label,
  onPress,
  danger = false,
  disabled = false,
}: {
  name: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: 48,
        minHeight: 48,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.35 : pressed ? 0.55 : 1,
      })}
    >
      <MaterialIcons name={name} size={23} color={danger ? c.danger : c.text} />
    </Pressable>
  );
}
export function Button({
  children,
  onPress,
  secondary = false,
  danger = false,
  disabled = false,
}: PropsWithChildren<{
  onPress: () => void;
  secondary?: boolean;
  danger?: boolean;
  disabled?: boolean;
}>) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderRadius: 14,
        backgroundColor: secondary ? c.soft : danger ? c.danger : c.accent,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.4 : pressed ? 0.65 : 1,
      })}
    >
      <Text
        style={{
          fontWeight: "600",
          fontSize: 15,
          color: secondary
            ? c.accent
            : c.isDark && !danger
              ? "#15271A"
              : "#FFFFFF",
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function Sheet({
  title,
  visible,
  onClose,
  children,
}: PropsWithChildren<{
  title: string;
  visible: boolean;
  onClose: () => void;
}>) {
  const c = usePalette();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          justifyContent: "center",
          padding: 24,
          backgroundColor: "#00000066",
        }}
      >
        <Pressable
          accessibilityLabel="Fechar janela"
          onPress={onClose}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: c.surface,
            borderRadius: 24,
            padding: 20,
            maxHeight: "85%",
            width: "100%",
            maxWidth: 500,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Text
              accessibilityRole="header"
              style={{
                color: c.text,
                fontSize: 21,
                fontWeight: "600",
                flex: 1,
              }}
            >
              {title}
            </Text>
            <IconButton name="close" label="Fechar" onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function MenuRow({
  label,
  detail,
  icon,
  onPress,
  danger = false,
}: {
  label: string;
  detail?: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  const c = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 54,
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        opacity: pressed ? 0.5 : 1,
      })}
    >
      {icon && (
        <MaterialIcons
          name={icon}
          size={22}
          color={danger ? c.danger : c.muted}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, color: danger ? c.danger : c.text }}>
          {label}
        </Text>
        {detail && (
          <Text
            style={{
              marginTop: 5,
              lineHeight: 20,
              fontSize: 13,
              color: c.muted,
            }}
          >
            {detail}
          </Text>
        )}
      </View>
    </Pressable>
  );
}
export function FolderPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (id: string) => void;
}) {
  const { data } = useNotebook();
  return (
    <Sheet title="Mover para" visible={visible} onClose={onClose}>
      {[{ id: "padrao", nome: "Sem pasta" }, ...data.pastas].map((folder) => (
        <MenuRow
          key={folder.id}
          label={folder.nome}
          icon="folder-open"
          onPress={() => {
            onPick(folder.id);
            onClose();
          }}
        />
      ))}
    </Sheet>
  );
}
export function Empty({
  title,
  detail,
  children,
}: PropsWithChildren<{ title: string; detail: string }>) {
  const c = usePalette();
  return (
    <View style={{ padding: 32, alignItems: "center", gap: 14, marginTop: 60 }}>
      <View style={{ padding: 22, borderRadius: 28, backgroundColor: c.soft }}>
        <MaterialIcons name="notes" size={32} color={c.accent} />
      </View>
      <Text
        style={{
          color: c.text,
          fontSize: 22,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: c.muted,
          fontSize: 15,
          lineHeight: 23,
          textAlign: "center",
          maxWidth: 300,
        }}
      >
        {detail}
      </Text>
      {children}
    </View>
  );
}
export function Loading() {
  const c = usePalette();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}
export function NameDialog({
  title,
  initial = "",
  visible,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: string;
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const c = usePalette();
  return (
    <Sheet title={title} visible={visible} onClose={onClose}>
      <TextInput
        accessibilityLabel="Nome da pasta"
        placeholder="Nome da pasta"
        placeholderTextColor={c.muted}
        value={name}
        onChangeText={setName}
        maxLength={80}
        autoFocus
        style={{
          color: c.text,
          fontSize: 18,
          padding: 14,
          borderWidth: 1,
          borderColor: c.line,
          borderRadius: 12,
          marginBottom: 16,
        }}
      />
      <Button
        disabled={busy || !name.trim()}
        onPress={() => {
          setBusy(true);
          void onSubmit(name.trim())
            .then(onClose)
            .catch(reportError)
            .finally(() => setBusy(false));
        }}
      >
        Salvar pasta
      </Button>
    </Sheet>
  );
}
export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}
