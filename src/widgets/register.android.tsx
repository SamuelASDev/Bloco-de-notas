import { TurboModuleRegistry } from "react-native";

// Keep the rest of the notebook usable in Expo Go, which has no widget module.
if (TurboModuleRegistry.get("AndroidWidget")) {
  // Synchronous registration is required before Android starts a headless task.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("./task");
}
