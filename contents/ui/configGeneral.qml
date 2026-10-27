import QtQuick
import QtQuick.Controls as Controls
import QtQuick.Layouts

ColumnLayout {
    property alias cfg_filterMode: filterCombo.currentIndex

    Controls.Label {
        text: i18n("Default Color Theme:")
    }

    Controls.ComboBox {
        id: filterCombo
        model: [
            "Natural Color",
            "Amber Terminal (Phosphor)",
            "CRT Green (Fallout / Matrix)",
            "Cyber Cyan (Tactical)",
            "Monochrome White"
        ]
    }
}
