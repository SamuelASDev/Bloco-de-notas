import { MaterialIcons } from "@expo/vector-icons";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

interface BarraPesquisaProps {
  valor: string;
  onChangeText: (texto: string) => void;
}

export default function BarraPesquisa({
  valor,
  onChangeText,
}: BarraPesquisaProps) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="search" size={24} color="#888" style={styles.icon} />
      <TextInput
        style={styles.input}
        placeholder="Pesquisar notas..."
        placeholderTextColor="#888"
        value={valor}
        onChangeText={onChangeText}
      />
      {/* Botão de limpar (X) só aparece se houver texto */}
      {valor.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText("")} style={styles.icon}>
          <MaterialIcons name="close" size={24} color="#888" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    margin: 15,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 45,
  },
  icon: {
    padding: 5,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 5,
  },
});
