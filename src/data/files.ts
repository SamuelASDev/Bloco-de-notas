import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { Data, Note, noteText, noteTitle, parseBackup } from "./model";

export async function exportFile(text: string, name: string, mimeType: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error(
      "O compartilhamento não está disponível neste dispositivo.",
    );
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(text);
  await Sharing.shareAsync(file.uri, {
    mimeType,
    dialogTitle: "Salvar arquivo",
    UTI: mimeType === "application/json" ? "public.json" : "public.plain-text",
  });
}
export function exportText(note: Note) {
  const name =
    noteTitle(note)
      .replace(/[^\p{L}\p{N} _-]/gu, "")
      .slice(0, 60)
      .trim() || "nota";
  return exportFile(noteText(note), `${name}.txt`, "text/plain");
}
export function exportBackup(data: Data) {
  return exportFile(
    JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2),
    `caderno-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
    "application/json",
  );
}
export async function pickBackup(): Promise<Data | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain"],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.size && asset.size > 20 * 1024 * 1024)
    throw new Error("O backup deve ter no máximo 20 MB.");
  const text =
    Platform.OS === "web" && asset.file
      ? await asset.file.text()
      : await new File(asset.uri).text();
  if (text.length > 20 * 1024 * 1024)
    throw new Error("O backup deve ter no máximo 20 MB.");
  try {
    return parseBackup(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new Error("O arquivo não contém um JSON válido.");
    throw error;
  }
}
