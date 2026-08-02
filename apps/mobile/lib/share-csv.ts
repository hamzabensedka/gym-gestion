import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

/** Write CSV to cache and open the native share sheet. */
export async function shareCsv(filename: string, contents: string) {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, contents, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing unavailable");
  }
  await Sharing.shareAsync(path, {
    mimeType: "text/csv",
    dialogTitle: filename,
    UTI: "public.comma-separated-values-text",
  });
}
