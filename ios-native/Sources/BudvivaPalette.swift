import SwiftUI

/// Paleta visual nativa sin dependencias externas ni cambios de datos.
struct BudvivaPalette {
    static let themes = ["oceano","esmeralda","arena","noche"]
    let id: String
    init(_ id: String) { self.id = Self.themes.contains(id) ? id : "oceano" }
    var accent: Color {
        switch id {
        case "esmeralda": return Color(red:0.03,green:0.47,blue:0.38)
        case "arena": return Color(red:0.53,green:0.31,blue:0.12)
        case "noche": return Color(red:0.49,green:0.80,blue:1.0)
        default: return Color(red:0.08,green:0.36,blue:0.62)
        }
    }
    var canvas: Color {
        switch id {
        case "esmeralda": return Color(red:0.95,green:0.98,blue:0.97)
        case "arena": return Color(red:0.98,green:0.97,blue:0.95)
        case "noche": return Color(red:0.05,green:0.09,blue:0.16)
        default: return Color(red:0.95,green:0.97,blue:0.99)
        }
    }
    var surface: Color {
        id == "noche" ? Color(red:0.10,green:0.16,blue:0.25) : .white
    }
    var soft: Color {
        switch id {
        case "esmeralda": return Color(red:0.87,green:0.96,blue:0.93)
        case "arena": return Color(red:1,green:0.94,blue:0.87)
        case "noche": return Color(red:0.13,green:0.24,blue:0.36)
        default: return Color(red:0.91,green:0.95,blue:1.0)
        }
    }
    var hero: LinearGradient {
        let colors: [Color]
        switch id {
        case "esmeralda": colors=[Color(red:0.04,green:0.46,blue:0.43),Color(red:0.09,green:0.21,blue:0.30)]
        case "arena": colors=[Color(red:0.64,green:0.41,blue:0.27),Color(red:0.32,green:0.26,blue:0.23)]
        case "noche": colors=[Color(red:0.14,green:0.36,blue:0.58),Color(red:0.08,green:0.15,blue:0.27)]
        default: colors=[Color(red:0.14,green:0.35,blue:0.79),Color(red:0.08,green:0.18,blue:0.40)]
        }
        return LinearGradient(colors:colors,startPoint:.topLeading,endPoint:.bottomTrailing)
    }
}
