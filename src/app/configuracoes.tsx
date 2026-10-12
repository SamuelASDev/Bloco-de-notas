import { MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
// MUDANÇA AQUI: Agora importamos da pasta 'legacy' para usar o sistema antigo
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { Drawer } from "expo-router/drawer";
import * as Sharing from "expo-sharing";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const FS: any = FileSystem;

export default function Configuracoes() {
  // --- FUNÇÃO DE EXPORTAR (BACKUP) ---
  const exportarBackup = async () => {
    try {
      const notasSalvas = await AsyncStorage.getItem("notas");
      const pastasSalvas = await AsyncStorage.getItem("pastas");

      const backup = {
        notas: notasSalvas ? JSON.parse(notasSalvas) : [],
        pastas: pastasSalvas ? JSON.parse(pastasSalvas) : [],
      };

      const jsonString = JSON.stringify(backup);

      const fileUri = FS.documentDirectory + "backup_blocodenotas.json";

      await FS.writeAsStringAsync(fileUri, jsonString, {
        encoding: FS.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Salvar Backup de Notas",
          UTI: "public.json",
        });
      } else {
        Alert.alert(
          "Erro",
          "O compartilhamento de arquivos não está disponível neste dispositivo.",
        );
      }
    } catch (error) {
      console.log("Erro ao exportar:", error);
      Alert.alert("Erro", "Não foi possível gerar o backup.");
    }
  };

  // --- FUNÇÃO DE IMPORTAR (RESTAURAR) ---
  const importarBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const file = new File(result.assets[0].uri);
      const jsonString = await file.text();

      const backup = JSON.parse(jsonString);

      if (
        !backup ||
        typeof backup !== "object" ||
        !Array.isArray(backup.notas) ||
        !Array.isArray(backup.pastas)
      ) {
        Alert.alert(
          "Arquivo inválido",
          "Este arquivo não parece ser um backup válido do Bloco de Notas.",
        );
        return;
      }

      Alert.alert(
        "Atenção!",
        "Importar um backup substituirá suas notas e pastas atuais. Deseja continuar?",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Substituir Tudo",
            style: "destructive",
            onPress: async () => {
              try {
                await AsyncStorage.multiSet([
                  ["notas", JSON.stringify(backup.notas)],
                  ["pastas", JSON.stringify(backup.pastas)],
                ]);

                Alert.alert(
                  "Sucesso",
                  "Backup restaurado! Volte à tela inicial.",
                );
              } catch (error) {
                console.log("Erro ao restaurar:", error);
                Alert.alert("Erro", "Não foi possível restaurar o backup.");
              }
            },
          },
        ],
      );
    } catch (error) {
      console.log("Erro ao importar:", error);
      Alert.alert(
        "Erro",
        "Não foi possível ler o arquivo. Selecione um backup JSON válido.",
      );
    }
  };

  return (
    <View style={styles.container}>
      <Drawer.Screen
        options={{
          headerTitle: "Configurações",
          headerTintColor: "#fff",
        }}
      />

      <View style={styles.secao}>
        <View style={styles.cabecalhoSecao}>
          <MaterialIcons name="security" size={28} color="#4A64E6" />
          <Text style={styles.tituloSecao}>Backup de Dados</Text>
        </View>
        <Text style={styles.descricao}>
          Exporte os seus dados para não os perder quando trocar de telemóvel,
          ou importe um arquivo gerado anteriormente.
        </Text>

        <TouchableOpacity style={styles.botaoPrimario} onPress={exportarBackup}>
          <MaterialIcons name="file-upload" size={24} color="#fff" />
          <Text style={styles.textoBotaoBranco}>Gerar Backup (.json)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={importarBackup}
        >
          <MaterialIcons name="file-download" size={24} color="#4A64E6" />
          <Text style={styles.textoBotaoAzul}>Restaurar Backup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FC",
  },
  secao: {
    backgroundColor: "#FFFFFF",
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
  },
  cabecalhoSecao: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  tituloSecao: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#222",
    marginLeft: 8,
  },
  descricao: {
    fontSize: 15,
    color: "#666",
    marginBottom: 25,
    lineHeight: 22,
  },
  botaoPrimario: {
    flexDirection: "row",
    backgroundColor: "#4A64E6",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  textoBotaoBranco: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
  botaoSecundario: {
    flexDirection: "row",
    backgroundColor: "#E6F4FE",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  textoBotaoAzul: {
    color: "#4A64E6",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
