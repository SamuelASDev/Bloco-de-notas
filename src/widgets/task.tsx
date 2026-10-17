import { registerWidgetTaskHandler } from "react-native-android-widget";
import { QuickNoteWidget } from "./quick-note";

registerWidgetTaskHandler(async ({ widgetAction, renderWidget }) => {
  if (
    widgetAction === "WIDGET_ADDED" ||
    widgetAction === "WIDGET_UPDATE" ||
    widgetAction === "WIDGET_RESIZED"
  )
    renderWidget(<QuickNoteWidget />);
});
