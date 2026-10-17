export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}) {
  try {
    return new URL(path).hostname === "expo-sharing" ? "/receber" : path;
  } catch {
    return path.startsWith("/") ? path : "/";
  }
}
