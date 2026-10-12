import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import {
  Drawer,
  DrawerContentScrollView,
  DrawerItem,
} from "expo-router/drawer";
import { useEffect, useState } from "react";
import {
  Alert, // Importante para o Pop-up de confirmação
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function CustomDrawerContent(props: any) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  const pastaAtiva = (params.pastaId as string) || "padrao";

  const [pastas, setPastas] = useState<any[]>([]);

  const [modalNovaPasta, setModalNovaPasta] = useState(false);
  const [nomeNovaPasta, setNomeNovaPasta] = useState("");

  const [modalEditarPasta, setModalEditarPasta] = useState(false);
  const [nomeEditarPasta, setNomeEditarPasta] = useState("");

  useEffect(() => {
    carregarPastas();
  }, [modalNovaPasta, modalEditarPasta]);

  const carregarPastas = async () => {
    const salvas = await AsyncStorage.getItem("pastas");
    if (salvas) setPastas(JSON.parse(salvas));
  };

  const criarPasta = async () => {
    if (nomeNovaPasta.trim() === "") return;
    const nova = { id: Date.now().toString(), nome: nomeNovaPasta };
    const novasPastas = [...pastas, nova];
    await AsyncStorage.setItem("pastas", JSON.stringify(novasPastas));
    setModalNovaPasta(false);
    setNomeNovaPasta("");
  };

  const renomearPasta = async () => {
    if (nomeEditarPasta.trim() === "") return;
    const novasPastas = pastas.map((p) =>
      p.id === pastaAtiva ? { ...p, nome: nomeEditarPasta } : p,
    );
    await AsyncStorage.setItem("pastas", JSON.stringify(novasPastas));
    setModalEditarPasta(false);
  };

  // --- NOVA VARREDURA ANTES DE EXCLUIR ---
  const confirmarExclusaoPasta = async () => {
    const notasSalvas = await AsyncStorage.getItem("notas");
    let totalAtivas = 0;
    let totalLixeira = 0;

    // Faz a varredura para contar o que tem na pasta
    if (notasSalvas) {
      const arrayNotas = JSON.parse(notasSalvas);
      arrayNotas.forEach((n: any) => {
        if (n.pastaId === pastaAtiva) {
          if (n.lixeira) {
            totalLixeira++;
          } else {
            totalAtivas++;
          }
        }
      });
    }

    const total = totalAtivas + totalLixeira;

    // Se tiver notas (ativas ou na lixeira), mostra o aviso detalhado
    if (total > 0) {
      Alert.alert(
        "Atenção!",
        `Esta pasta contém ${totalAtivas} nota(s) ativa(s) e ${totalLixeira} nota(s) na lixeira.\n\nAo excluir a pasta, TODAS estas notas serão apagadas permanentemente. Tem a certeza?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Excluir Tudo", style: "destructive", onPress: excluirPasta },
        ],
      );
    } else {
      // Se a pasta estiver totalmente vazia, pede uma confirmação simples
      Alert.alert(
        "Excluir Pasta",
        "Tem a certeza que deseja excluir esta pasta?",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Excluir", style: "destructive", onPress: excluirPasta },
        ],
      );
    }
  };

  const excluirPasta = async () => {
    // 1. Remove a pasta
    const novasPastas = pastas.filter((p) => p.id !== pastaAtiva);
    await AsyncStorage.setItem("pastas", JSON.stringify(novasPastas));

    // 2. Exclui PERMANENTEMENTE todas as notas dessa pasta (varrendo a lixeira junto)
    const notasSalvas = await AsyncStorage.getItem("notas");
    if (notasSalvas) {
      let arrayNotas = JSON.parse(notasSalvas);
      arrayNotas = arrayNotas.filter((n: any) => n.pastaId !== pastaAtiva);
      await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));
    }

    setModalEditarPasta(false);
    // 3. Volta para a aba padrão
    router.push({ pathname: "/", params: { pastaId: "padrao" } });
  };

  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView
        {...props}
        style={styles.drawerScroll}
        contentContainerStyle={styles.drawerContent}
        bounces={false}
      >
        <View style={[styles.drawerHeader, { paddingTop: insets.top + 15 }]}>
          <Text style={styles.drawerHeaderText}>Bloco de Notas Rápido</Text>
        </View>

        <DrawerItem
          label="Minhas Notas"
          icon={({ color }) => (
            <MaterialIcons name="folder-special" size={26} color={color} />
          )}
          focused={pathname === "/" && pastaAtiva === "padrao"}
          activeTintColor="#6883F1"
          activeBackgroundColor="#E5E5E5"
          inactiveTintColor="#333"
          style={styles.drawerItem}
          labelStyle={styles.drawerLabel}
          onPress={() =>
            router.push({ pathname: "/", params: { pastaId: "padrao" } })
          }
        />

        {pastas.map((pasta) => (
          <DrawerItem
            key={pasta.id}
            label={pasta.nome}
            icon={({ color }) => (
              <MaterialIcons name="folder" size={26} color={color} />
            )}
            focused={pathname === "/" && pastaAtiva === pasta.id}
            activeTintColor="#6883F1"
            activeBackgroundColor="#E5E5E5"
            inactiveTintColor="#333"
            style={styles.drawerItem}
            labelStyle={styles.drawerLabel}
            onPress={() =>
              router.push({ pathname: "/", params: { pastaId: pasta.id } })
            }
          />
        ))}

        <View style={styles.linhaAzul} />

        {pastaAtiva === "padrao" || pathname !== "/" ? (
          <DrawerItem
            label="Nova pasta"
            icon={({ color }) => (
              <MaterialIcons name="create-new-folder" size={26} color={color} />
            )}
            inactiveTintColor="#333"
            style={styles.drawerItem}
            labelStyle={styles.drawerLabel}
            onPress={() => {
              setNomeNovaPasta("");
              setModalNovaPasta(true);
            }}
          />
        ) : (
          <DrawerItem
            label="Editar pasta"
            icon={({ color }) => (
              <MaterialIcons name="edit" size={26} color={color} />
            )}
            inactiveTintColor="#333"
            style={styles.drawerItem}
            labelStyle={styles.drawerLabel}
            onPress={() => {
              const p = pastas.find((p) => p.id === pastaAtiva);
              setNomeEditarPasta(p?.nome || "");
              setModalEditarPasta(true);
            }}
          />
        )}

        <DrawerItem
          label="Lixeira"
          icon={({ color }) => (
            <MaterialIcons name="delete" size={26} color={color} />
          )}
          focused={pathname === "/lixeira"}
          activeTintColor="#6883F1"
          activeBackgroundColor="#E5E5E5"
          inactiveTintColor="#333"
          style={styles.drawerItem}
          labelStyle={styles.drawerLabel}
          onPress={() => router.push("/lixeira")}
        />

        <DrawerItem
          label="Configurações"
          icon={({ color }) => (
            <MaterialIcons name="settings" size={26} color={color} />
          )}
          focused={pathname === "/configuracoes"}
          activeTintColor="#6883F1"
          activeBackgroundColor="#E5E5E5"
          inactiveTintColor="#333"
          style={styles.drawerItem}
          labelStyle={styles.drawerLabel}
          onPress={() => router.push("/configuracoes")}
        />
      </DrawerContentScrollView>

      {/* POP-UP: CRIAR NOVA PASTA */}
      <Modal transparent={true} visible={modalNovaPasta} animationType="fade">
        <View style={styles.fundoModal}>
          <View style={styles.caixaModal}>
            <Text style={styles.tituloModal}>Nova Pasta</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="Nome da pasta"
              autoFocus
              value={nomeNovaPasta}
              onChangeText={setNomeNovaPasta}
            />
            <View style={styles.botoesModal}>
              <TouchableOpacity onPress={() => setModalNovaPasta(false)}>
                <Text style={styles.textoBotaoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={criarPasta}>
                <Text style={styles.textoBotaoAcao}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* POP-UP: EDITAR/EXCLUIR PASTA */}
      <Modal transparent={true} visible={modalEditarPasta} animationType="fade">
        <View style={styles.fundoModal}>
          <View style={styles.caixaModal}>
            <Text style={styles.tituloModal}>Editar Pasta</Text>
            <TextInput
              style={styles.inputModal}
              placeholder="Novo nome"
              autoFocus
              value={nomeEditarPasta}
              onChangeText={setNomeEditarPasta}
            />

            {/* Agora o botão chama a função de varredura! */}
            <TouchableOpacity
              style={styles.botaoExcluirPasta}
              onPress={confirmarExclusaoPasta}
            >
              <MaterialIcons name="delete" size={20} color="#d9534f" />
              <Text style={styles.textoExcluirPasta}>Excluir Pasta</Text>
            </TouchableOpacity>

            <View style={styles.botoesModal}>
              <TouchableOpacity onPress={() => setModalEditarPasta(false)}>
                <Text style={styles.textoBotaoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={renomearPasta}>
                <Text style={styles.textoBotaoAcao}>Renomear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4A64E6" />
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: "#4A64E6",
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: "#fff",
          drawerType: "front",
          drawerStyle: { width: "80%", backgroundColor: "#fff" },
        }}
      >
        <Drawer.Screen name="index" />
        <Drawer.Screen name="lixeira" />
        <Drawer.Screen name="configuracoes" />
        <Drawer.Screen
          name="nova-nota"
          options={{
            drawerItemStyle: { display: "none" },
            title: "",
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ marginLeft: 20 }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 24, fontWeight: "bold" }}
                >
                  ←
                </Text>
              </TouchableOpacity>
            ),
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  drawerScroll: { flex: 1, backgroundColor: "#fff" },
  drawerContent: {
    flexGrow: 1,
    paddingTop: 0,
    marginHorizontal: -20,
    backgroundColor: "#fff",
  },
  drawerHeader: {
    backgroundColor: "#6883F1",
    justifyContent: "flex-end",
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  drawerHeaderText: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  drawerItem: {
    borderRadius: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    paddingLeft: 10,
  },
  drawerLabel: { fontSize: 16, marginLeft: 0, fontWeight: "500" },
  linhaAzul: {
    height: 1,
    backgroundColor: "#6883F1",
    marginVertical: 10,
    marginHorizontal: 15,
    opacity: 0.5,
  },
  fundoModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  caixaModal: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 20,
    elevation: 5,
  },
  tituloModal: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  inputModal: {
    borderBottomWidth: 1,
    borderBottomColor: "#6883F1",
    fontSize: 16,
    marginBottom: 20,
    paddingVertical: 5,
  },
  botoesModal: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 10,
  },
  textoBotaoCancelar: {
    color: "#888",
    fontSize: 16,
    marginRight: 20,
    fontWeight: "bold",
  },
  textoBotaoAcao: { color: "#4A64E6", fontSize: 16, fontWeight: "bold" },
  botaoExcluirPasta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  textoExcluirPasta: {
    color: "#d9534f",
    fontSize: 16,
    marginLeft: 5,
    fontWeight: "500",
  },
});
