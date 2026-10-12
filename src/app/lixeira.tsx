import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { Drawer } from "expo-router/drawer"; // Importante para o cabeçalho
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function Lixeira() {
  const [notas, setNotas] = useState<any[]>([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState<any>(null);

  // Estados para a barra de pesquisa
  const [pesquisa, setPesquisa] = useState("");
  const [pesquisaVisivel, setPesquisaVisivel] = useState(false);

  useFocusEffect(
    useCallback(() => {
      carregarLixeira();
    }, []),
  );

  const carregarLixeira = async () => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      if (notasSalvas) {
        const todasNotas = JSON.parse(notasSalvas);
        setNotas(todasNotas.filter((n: any) => n.lixeira));
      }
    } catch (error) {
      console.log("Erro ao carregar a lixeira:", error);
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

  const restaurarNota = async () => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      let arrayNotas = notasSalvas ? JSON.parse(notasSalvas) : [];

      arrayNotas = arrayNotas.map((n: any) =>
        n.id === notaSelecionada.id ? { ...n, lixeira: false } : n,
      );

      await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));
      setNotas(arrayNotas.filter((n: any) => n.lixeira));
      setModalVisivel(false);
      setNotaSelecionada(null);
    } catch (error) {
      console.log("Erro ao restaurar:", error);
    }
  };

  const excluirPermanente = async () => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      let arrayNotas = notasSalvas ? JSON.parse(notasSalvas) : [];

      arrayNotas = arrayNotas.filter((n: any) => n.id !== notaSelecionada.id);

      await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));
      setNotas(arrayNotas.filter((n: any) => n.lixeira));
      setModalVisivel(false);
      setNotaSelecionada(null);
    } catch (error) {
      console.log("Erro ao excluir permanentemente:", error);
    }
  };

  const confirmarEsvaziarLixeira = () => {
    Alert.alert(
      "Esvaziar Lixeira",
      "Tem a certeza que deseja excluir permanentemente todas as notas da lixeira? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Esvaziar", style: "destructive", onPress: esvaziarLixeira },
      ],
    );
  };

  const esvaziarLixeira = async () => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      if (notasSalvas) {
        const todasNotas = JSON.parse(notasSalvas);
        const notasRestantes = todasNotas.filter((n: any) => !n.lixeira);
        await AsyncStorage.setItem("notas", JSON.stringify(notasRestantes));
        setNotas([]);
      }
    } catch (error) {
      console.log("Erro ao esvaziar a lixeira:", error);
    }
  };

  // Filtramos as notas da lixeira pela pesquisa
  const notasFiltradas = notas.filter((nota) =>
    nota.texto.toLowerCase().includes(pesquisa.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      {/* Componente que injeta a pesquisa no cabeçalho */}
      <Drawer.Screen
        options={{
          headerTitle: () =>
            pesquisaVisivel ? (
              <TextInput
                style={styles.inputCabecalho}
                placeholder="Pesquisar na lixeira..."
                placeholderTextColor="#C0CCFF"
                autoFocus={true}
                value={pesquisa}
                onChangeText={setPesquisa}
              />
            ) : (
              <Text style={styles.tituloCabecalho}>Lixeira</Text>
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
            : "A lixeira está vazia."}
        </Text>
      ) : (
        <FlatList
          data={notasFiltradas} // Usa as notas filtradas
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.cardNota}
              onPress={() => {
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

      {/* Oculta o botão de esvaziar tudo se a pesquisa não retornar nada ou a lixeira estiver vazia */}
      {notasFiltradas.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={confirmarEsvaziarLixeira}>
          <MaterialIcons name="delete-sweep" size={28} color="white" />
        </TouchableOpacity>
      )}

      <Modal transparent={true} visible={modalVisivel} animationType="fade">
        <TouchableOpacity
          style={styles.fundoModal}
          onPress={() => setModalVisivel(false)}
          activeOpacity={1}
        >
          <View style={styles.caixaMenu}>
            <TouchableOpacity style={styles.itemMenu} onPress={restaurarNota}>
              <Text style={[styles.textoMenu, { color: "#4A64E6" }]}>
                Restaurar Nota
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.itemMenu}
              onPress={excluirPermanente}
            >
              <Text style={[styles.textoMenu, { color: "#d9534f" }]}>
                Excluir Permanentemente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.itemMenu}
              onPress={() => setModalVisivel(false)}
            >
              <Text
                style={[
                  styles.textoMenu,
                  { fontWeight: "bold", color: "#333" },
                ]}
              >
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  // Estilos do cabeçalho
  tituloCabecalho: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  inputCabecalho: {
    color: "#fff",
    fontSize: 18,
    width: "100%",
  },

  textoVazio: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 50,
  },
  cardNota: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  textoNota: {
    fontSize: 18,
    color: "#222",
    marginBottom: 8,
  },
  dataNota: {
    fontSize: 14,
    color: "#888888",
    textAlign: "right",
  },
  fab: {
    position: "absolute",
    width: 60,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    right: 20,
    bottom: 35,
    backgroundColor: "#d9534f",
    borderRadius: 30,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
  },
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
  itemMenu: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  textoMenu: {
    fontSize: 16,
    color: "#333",
  },
});
