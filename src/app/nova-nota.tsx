import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { Drawer } from "expo-router/drawer";
import { useEffect, useRef, useState } from "react";
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function NovaNota() {
  const params = useLocalSearchParams();
  const idNota = params.id as string;
  const textoInicial = (params.textoInicial as string) || "";

  // Usamos um estado local para a pasta para poder alterá-la dinamicamente
  const [pastaIdAtual, setPastaIdAtual] = useState(
    (params.pastaId as string) || "padrao",
  );

  const [texto, setTexto] = useState(textoInicial);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [modalMoverVisivel, setModalMoverVisivel] = useState(false);
  const [pastas, setPastas] = useState<any[]>([]);

  const [posicaoCursor, setPosicaoCursor] = useState<
    { start: number; end: number } | undefined
  >(undefined);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTexto(textoInicial);
    setPosicaoCursor({ start: 0, end: 0 });
    carregarPastas();
  }, [idNota]);

  const carregarPastas = async () => {
    const pastasSalvas = await AsyncStorage.getItem("pastas");
    if (pastasSalvas) setPastas(JSON.parse(pastasSalvas));
  };

  const salvarNota = async (novoTexto: string, idDaPasta = pastaIdAtual) => {
    setTexto(novoTexto);
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      let arrayNotas = notasSalvas ? JSON.parse(notasSalvas) : [];

      arrayNotas = arrayNotas.filter((n: any) => n.id !== idNota);

      if (novoTexto.trim() === "") {
        await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));
        return;
      }

      arrayNotas.unshift({
        id: idNota,
        texto: novoTexto,
        data: new Date().toISOString(),
        pastaId: idDaPasta, // Usa a pasta do parâmetro ou a atual
        lixeira: false,
      });

      await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));
    } catch (error) {
      console.log("Erro:", error);
    }
  };

  // --- NOVA FUNÇÃO: Mover a partir da edição ---
  const moverNota = (novaPastaId: string) => {
    setPastaIdAtual(novaPastaId);
    setModalMoverVisivel(false);
    setMenuVisivel(false);

    // Força o salvamento na nova pasta imediatamente
    if (texto.trim() !== "") {
      salvarNota(texto, novaPastaId);
    }
  };

  const desfazerEdicao = () => {
    salvarNota(textoInicial, pastaIdAtual);
    setMenuVisivel(false);
  };

  const paraOFinal = () => {
    setMenuVisivel(false);
    setTimeout(() => {
      inputRef.current?.focus();
      setPosicaoCursor({ start: texto.length, end: texto.length });
    }, 100);
  };

  const excluirNota = async () => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      let arrayNotas = notasSalvas ? JSON.parse(notasSalvas) : [];

      arrayNotas = arrayNotas.map((n: any) =>
        n.id === idNota ? { ...n, lixeira: true } : n,
      );

      await AsyncStorage.setItem("notas", JSON.stringify(arrayNotas));
      setMenuVisivel(false);
      router.back();
    } catch (error) {
      console.log("Erro ao excluir:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Drawer.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setMenuVisivel(true)}
              style={{ marginRight: 5, padding: 15 }}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Text style={{ color: "#fff", fontSize: 26, fontWeight: "bold" }}>
                ⋮
              </Text>
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Comece a escrever..."
            multiline={true}
            autoFocus={true}
            textAlignVertical="top"
            value={texto}
            onChangeText={(t) => salvarNota(t)} // Usa a pastaIdAtual padrão
            selection={posicaoCursor}
            onSelectionChange={() => {
              if (posicaoCursor) setPosicaoCursor(undefined);
            }}
          />
        </View>
      </ScrollView>

      {/* MODAL 1: Opções Principais */}
      <Modal transparent={true} visible={menuVisivel} animationType="fade">
        <TouchableOpacity
          style={styles.fundoModal}
          onPress={() => setMenuVisivel(false)}
          activeOpacity={1}
        >
          <View style={styles.caixaMenu}>
            <TouchableOpacity style={styles.itemMenu} onPress={desfazerEdicao}>
              <Text style={styles.textoMenu}>Desfazer edição</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.itemMenu}
              onPress={() => {
                setMenuVisivel(false);
                setModalMoverVisivel(true);
              }}
            >
              <Text style={styles.textoMenu}>Mover pasta</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.itemMenu} onPress={paraOFinal}>
              <Text style={styles.textoMenu}>Para o final</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.itemMenu} onPress={excluirNota}>
              <Text style={styles.textoMenu}>Excluir</Text>
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
          style={styles.fundoModalBase}
          onPress={() => setModalMoverVisivel(false)}
          activeOpacity={1}
        >
          <View style={[styles.caixaMenuCentral, { maxHeight: "60%" }]}>
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
              {pastaIdAtual !== "padrao" && (
                <TouchableOpacity
                  style={styles.itemMenu}
                  onPress={() => moverNota("padrao")}
                >
                  <Text style={styles.textoMenu}>Minhas Notas</Text>
                </TouchableOpacity>
              )}
              {pastas.map((pasta) => {
                if (pasta.id === pastaIdAtual) return null;
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
  scrollContainer: { flexGrow: 1 },
  inputContainer: { flex: 1, padding: 10, paddingBottom: 50 },
  input: { flex: 1, fontSize: 18, color: "#333" },
  fundoModal: { flex: 1 },
  fundoModalBase: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  caixaMenu: {
    position: "absolute",
    top: 60,
    right: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    minWidth: 180,
    paddingVertical: 8,
  },
  caixaMenuCentral: {
    width: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    paddingVertical: 10,
  },
  itemMenu: { paddingVertical: 12, paddingHorizontal: 16 },
  textoMenu: { fontSize: 16, color: "#333" },
});
