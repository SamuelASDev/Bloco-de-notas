import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Home() {
  const params = useLocalSearchParams();
  const pastaAtual = (params.pastaId as string) || "padrao";

  const [notas, setNotas] = useState<any[]>([]);
  const [pastas, setPastas] = useState<any[]>([]); // Novo: Estado para guardar as pastas
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalMoverVisivel, setModalMoverVisivel] = useState(false); // Novo: Modal de mover
  const [notaSelecionada, setNotaSelecionada] = useState<any>(null);

  const [nomePastaAtual, setNomePastaAtual] = useState("Minhas Notas");
  const [pesquisa, setPesquisa] = useState("");
  const [pesquisaVisivel, setPesquisaVisivel] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [pastaAtual]),
  );

  const carregarDados = async () => {
    try {
      // Carrega as pastas
      const pastasSalvas = await AsyncStorage.getItem("pastas");
      let pastasArray = [];
      if (pastasSalvas) {
        pastasArray = JSON.parse(pastasSalvas);
        setPastas(pastasArray);
      }

      // Define o nome da pasta atual
      if (pastaAtual === "padrao") {
        setNomePastaAtual("Minhas Notas");
      } else {
        const pastaEncontrada = pastasArray.find(
          (p: any) => p.id === pastaAtual,
        );
        if (pastaEncontrada) setNomePastaAtual(pastaEncontrada.nome);
      }

      // Carrega as notas
      const notasSalvas = await AsyncStorage.getItem("notas");
      if (notasSalvas) {
        const todasNotas = JSON.parse(notasSalvas);
        setNotas(
          todasNotas.filter((n: any) => {
            const notaPasta = n.pastaId || "padrao";
            return !n.lixeira && notaPasta === pastaAtual;
          }),
        );
      }
    } catch (error) {
      console.log("Erro ao carregar os dados:", error);
    }
  };

  const formatarData = (dataISO: string) => {
    if (!dataISO) return "";
    const data = new Date(dataISO);
    const dia = data.getDate().toString().padStart(2, "0");
    const meses = [
      "jan.",
      "fev.",
      "mar.",
      "abr.",
      "mai.",
      "jun.",
      "jul.",
      "ago.",
      "set.",
      "out.",
      "nov.",
      "dez.",
    ];
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    const hora = data.getHours().toString().padStart(2, "0");
    const minuto = data.getMinutes().toString().padStart(2, "0");
    return `${dia} de ${mes} de ${ano} ${hora}:${minuto}`;
  };

  const copiarNota = async () => {
    if (notaSelecionada) {
      await Clipboard.setStringAsync(notaSelecionada.texto);
      setModalVisivel(false);
      setNotaSelecionada(null);
    }
  };

  const excluirNota = async () => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      let arrayNotas = notasSalvas ? JSON.parse(notasSalvas) : [];
      arrayNotas = arrayNotas.map((n: any) =>
        n.id === notaSelecionada.id ? { ...n, lixeira: true } : n,
      );
      await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));

      setNotas(
        arrayNotas.filter((n: any) => {
          const notaPasta = n.pastaId || "padrao";
          return !n.lixeira && notaPasta === pastaAtual;
        }),
      );
      setModalVisivel(false);
      setNotaSelecionada(null);
    } catch (error) {
      console.log("Erro ao mover para a lixeira:", error);
    }
  };

  // --- NOVA FUNÇÃO: Mover Nota ---
  const moverNota = async (novaPastaId: string) => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      let arrayNotas = notasSalvas ? JSON.parse(notasSalvas) : [];

      // Atualiza o pastaId da nota selecionada
      arrayNotas = arrayNotas.map((n: any) =>
        n.id === notaSelecionada.id ? { ...n, pastaId: novaPastaId } : n,
      );

      await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));

      // Atualiza a tela removendo a nota da pasta atual
      setNotas(
        arrayNotas.filter((n: any) => {
          const notaPasta = n.pastaId || "padrao";
          return !n.lixeira && notaPasta === pastaAtual;
        }),
      );

      setModalMoverVisivel(false);
      setNotaSelecionada(null);
    } catch (error) {
      console.log("Erro ao mover a nota:", error);
    }
  };

  const notasFiltradas = notas.filter((nota) =>
    nota.texto.toLowerCase().includes(pesquisa.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <Drawer.Screen
        options={{
          headerTitle: () =>
            pesquisaVisivel ? (
              <TextInput
                style={styles.inputCabecalho}
                placeholder="Pesquisar..."
                placeholderTextColor="#C0CCFF"
                autoFocus={true}
                value={pesquisa}
                onChangeText={setPesquisa}
                autoCorrect={false}
                spellCheck={false}
                autoCapitalize="none"
              />
            ) : (
              <Text style={styles.tituloCabecalho}>{nomePastaAtual}</Text>
            ),
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                if (pesquisaVisivel) {
                  setPesquisa("");
                  setPesquisaVisivel(false);
                } else {
                  setPesquisaVisivel(true);
                }
              }}
              style={{ marginRight: 15, padding: 5 }}
            >
              <MaterialIcons
                name={pesquisaVisivel ? "close" : "search"}
                size={26}
                color="#fff"
              />
            </TouchableOpacity>
          ),
        }}
      />

      {notasFiltradas.length === 0 ? (
        <Text style={styles.textoVazio}>
          {pesquisa.length > 0
            ? "Nenhuma nota encontrada."
            : "Sem notas no momento."}
        </Text>
      ) : (
        <FlatList
          data={notasFiltradas}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardNota}
              onPress={() =>
                router.push({
                  pathname: "/nova-nota",
                  params: {
                    id: item.id,
                    textoInicial: item.texto,
                    pastaId: pastaAtual,
                  },
                })
              }
              onLongPress={() => {
                setNotaSelecionada(item);
                setModalVisivel(true);
              }}
            >
              <Text numberOfLines={1} style={styles.textoNota}>
                {item.texto}
              </Text>
              {item.data && (
                <Text style={styles.dataNota}>{formatarData(item.data)}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/nova-nota",
            params: { id: Date.now().toString(), pastaId: pastaAtual },
          })
        }
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* MODAL 1: Opções Principais da Nota */}
      <Modal transparent={true} visible={modalVisivel} animationType="fade">
        <TouchableOpacity
          style={styles.fundoModal}
          onPress={() => setModalVisivel(false)}
          activeOpacity={1}
        >
          <View style={styles.caixaMenu}>
            <TouchableOpacity style={styles.itemMenu} onPress={copiarNota}>
              <Text style={styles.textoMenu}>Copiar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.itemMenu}
              onPress={() => {
                setModalVisivel(false);
                setModalMoverVisivel(true);
              }}
            >
              <Text style={styles.textoMenu}>Mover</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={excluirNota}>
              <Text style={[styles.textoMenu, { color: "#d9534f" }]}>
                Excluir
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.itemMenu}
              onPress={() => setModalVisivel(false)}
            >
              <Text
                style={[
                  styles.textoMenu,
                  { fontWeight: "bold", color: "#4A64E6" },
                ]}
              >
                CANCELAR
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* MODAL 2: Selecionar Pasta para Mover */}
      <Modal
        transparent={true}
        visible={modalMoverVisivel}
        animationType="slide"
      >
        <TouchableOpacity
          style={styles.fundoModal}
          onPress={() => setModalMoverVisivel(false)}
          activeOpacity={1}
        >
          <View style={[styles.caixaMenu, { maxHeight: "60%" }]}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                padding: 15,
                borderBottomWidth: 1,
                borderColor: "#eee",
              }}
            >
              Mover para...
            </Text>
            <ScrollView>
              {/* Opção da pasta padrão */}
              {pastaAtual !== "padrao" && (
                <TouchableOpacity
                  style={styles.itemMenu}
                  onPress={() => moverNota("padrao")}
                >
                  <Text style={styles.textoMenu}>Minhas Notas</Text>
                </TouchableOpacity>
              )}

              {/* Lista as outras pastas */}
              {pastas.map((pasta) => {
                if (pasta.id === pastaAtual) return null; // Não mostra a pasta onde a nota já está
                return (
                  <TouchableOpacity
                    key={pasta.id}
                    style={styles.itemMenu}
                    onPress={() => moverNota(pasta.id)}
                  >
                    <Text style={styles.textoMenu}>{pasta.nome}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  tituloCabecalho: { color: "#fff", fontSize: 20, fontWeight: "600" },
  inputCabecalho: { color: "#fff", fontSize: 18, width: "100%" },
  textoVazio: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 50,
  },
  cardNota: { padding: 20, borderBottomWidth: 1, borderBottomColor: "#E0E0E0" },
  textoNota: { fontSize: 18, color: "#222", marginBottom: 8 },
  dataNota: { fontSize: 14, color: "#888888", textAlign: "right" },
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 35,
    backgroundColor: "#4A64E6",
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
  fabIcon: { fontSize: 30, color: "white" },
  fundoModal: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  caixaMenu: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    paddingVertical: 10,
  },
  itemMenu: { paddingVertical: 15, paddingHorizontal: 20 },
  textoMenu: { fontSize: 16, color: "#333" },
});
