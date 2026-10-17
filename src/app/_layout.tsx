import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { NavigationBar } from "expo-navigation-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { loadData, retrySave, useNotebook } from "@/data/store";
import {
  DialogHost,
  Empty,
  Loading,
  run,
  usePalette,
} from "@/components/notebook-ui";

export const unstable_settings = { anchor: "index" };

function Navigation() {
  const c = usePalette();
  const { ready, error, loadError } = useNotebook();
  useEffect(() => {
    void loadData();
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={c.isDark ? "light" : "dark"} />
      <NavigationBar style={c.isDark ? "dark" : "light"} />
      {error && (
        <View
          accessibilityLiveRegion="polite"
          style={{ backgroundColor: c.soft, padding: 16, paddingTop: 50 }}
        >
          <Text style={{ color: c.text }}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => run(retrySave)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={{ color: c.accent, fontWeight: "600" }}>
              Tentar novamente
            </Text>
          </Pressable>
        </View>
      )}
      {!ready ? (
        <Loading />
      ) : loadError ? (
        <Empty
          title="Não foi possível abrir o caderno"
          detail="O armazenamento original foi preservado. Use Tentar novamente para reabrir suas notas."
        />
      ) : (
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.bg },
            headerTintColor: c.text,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.bg },
            headerTitleStyle: { fontSize: 18, fontWeight: "600" },
            headerBackButtonDisplayMode: "minimal",
          }}
        >
          <Stack.Screen name="index" options={{ title: "Caderno" }} />
          <Stack.Screen name="nova-nota" options={{ title: "" }} />
          <Stack.Screen name="lixeira" options={{ title: "Lixeira" }} />
          <Stack.Screen
            name="configuracoes"
            options={{ title: "Preferências" }}
          />
        </Stack>
      )}
      <DialogHost />
    </View>
  );
}
export default function Layout() {
  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  );
}
