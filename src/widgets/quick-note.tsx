import { FlexWidget, TextWidget } from "react-native-android-widget";
export function QuickNoteWidget() {
  return (
    <FlexWidget
      style={{
        width: "match_parent",
        height: "match_parent",
        backgroundColor: "#F8F7F4",
        borderRadius: 22,
        padding: 18,
        justifyContent: "space-between",
      }}
      accessibilityLabel="Caderno, criar nota rápida"
    >
      <TextWidget
        text="Uma ideia agora?"
        style={{ color: "#222824", fontSize: 18, fontWeight: "600" }}
      />
      <FlexWidget style={{ flexDirection: "row", flexGap: 12 }}>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{
            uri: "blocodenotas://nova-nota?kind=text&pastaId=padrao",
          }}
          accessibilityLabel="Criar nota de texto"
          style={{ backgroundColor: "#356649", borderRadius: 12, padding: 14 }}
        >
          <TextWidget
            text="＋ Nota"
            style={{ color: "#FFFFFF", fontSize: 16 }}
          />
        </FlexWidget>
        <FlexWidget
          clickAction="OPEN_URI"
          clickActionData={{
            uri: "blocodenotas://nova-nota?kind=checklist&pastaId=padrao",
          }}
          accessibilityLabel="Criar checklist"
          style={{ backgroundColor: "#E8EFE6", borderRadius: 12, padding: 14 }}
        >
          <TextWidget
            text="✓ Lista"
            style={{ color: "#356649", fontSize: 16 }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
