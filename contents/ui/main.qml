import QtQuick
import org.kde.plasma.plasmoid

WallpaperItem {
    id: root

    property real time: 0.0
    property vector2d mouseNorm: Qt.vector2d(0, 0)
    
    property int filterMode: (root.configuration && root.configuration.filterMode !== undefined) ? root.configuration.filterMode : 0

    onFilterModeChanged: {
        if (root.configuration && root.configuration.filterMode !== filterMode) {
            root.configuration.filterMode = filterMode
        }
    }

    FrameAnimation {
        running: true
        onTriggered: {
            root.time += frameTime * 0.2
        }
    }

    Shortcut {
        sequence: "Ctrl+Alt+C"
        onActivated: {
            root.filterMode = (root.filterMode + 1) % 5
        }
    }

    MouseArea {
        anchors.fill: parent
        hoverEnabled: true
        acceptedButtons: Qt.AllButtons
        preventStealing: true

        onPositionChanged: (mouse) => {
            var nx = (mouse.x / width) * 2.0 - 1.0
            var ny = (mouse.y / height) * 2.0 - 1.0
            root.mouseNorm = Qt.vector2d(nx, -ny)
            console.log("ASCII Globe Mouse - x:", mouse.x, "y:", mouse.y, "norm:", root.mouseNorm)
        }
    }

    Image {
        id: earthImage
        source: Qt.resolvedUrl("../shaders/earth.jpg")
        visible: false
        fillMode: Image.Tile
    }

    ShaderEffect {
        anchors.fill: parent

        property real u_time: root.time
        property vector2d u_resolution: Qt.vector2d(width, height)
        property vector2d u_mouse: root.mouseNorm
        property real u_filter: root.filterMode
        property var source: earthImage

        fragmentShader: Qt.resolvedUrl("../shaders/globe.frag.qsb")
    }
}
