import type { AlertButton } from "react-native";
import { Alert as NativeAlert, Platform } from "react-native";
type Dialog = { title: string; message?: string; buttons: AlertButton[] };
let current: Dialog | null = null;
const listeners = new Set<() => void>();
export const subscribeDialog = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const getDialog = () => current;
export function closeDialog() {
  current = null;
  listeners.forEach((listener) => listener());
}
export const Alert = {
  alert(
    title: string,
    message?: string,
    buttons: AlertButton[] = [{ text: "Entendi" }],
  ) {
    if (Platform.OS !== "web") {
      NativeAlert.alert(title, message, buttons);
      return;
    }
    current = { title, message, buttons };
    listeners.forEach((listener) => listener());
  },
};
