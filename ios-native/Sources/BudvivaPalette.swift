import SwiftUI

/// Cuatro identidades visuales diferenciadas, manteniendo los IDs de preferencias anteriores.
/// Oscuros: oro y violeta. Claros: azul polar y blanco coral.
struct BudvivaPalette {
    static let themes = ["oceano","esmeralda","arena","noche"]
    let id: String
    init(_ id: String) { self.id = Self.themes.contains(id) ? id : "oceano" }

    var accent: Color {
        switch id {
        case "esmeralda": return Color(red:0.83,green:0.19,blue:0.25) // coral
        case "arena": return Color(red:0.99,green:0.75,blue:0.26) // oro
        case "noche": return Color(red:0.73,green:0.56,blue:1.0) // lavanda
        default: return Color(red:0.10,green:0.35,blue:0.87) // azul polar
        }
    }

    var canvas: Color {
        switch id {
        case "esmeralda": return Color(red:0.99,green:0.97,blue:0.96)
        case "arena": return Color(red:0.045,green:0.052,blue:0.067)
        case "noche": return Color(red:0.065,green:0.057,blue:0.105)
        default: return Color(red:0.95,green:0.97,blue:1.0)
        }
    }

    var surface: Color {
        switch id {
        case "arena": return Color(red:0.11,green:0.12,blue:0.14)
        case "noche": return Color(red:0.13,green:0.11,blue:0.19)
        case "esmeralda": return Color(red:1.0,green:0.99,blue:0.98)
        default: return .white
        }
    }

    var soft: Color {
        switch id {
        case "esmeralda": return Color(red:1.0,green:0.91,blue:0.91)
        case "arena": return Color(red:0.23,green:0.19,blue:0.12)
        case "noche": return Color(red:0.23,green:0.16,blue:0.33)
        default: return Color(red:0.89,green:0.94,blue:1.0)
        }
    }

    var hero: LinearGradient {
        let colors: [Color]
        switch id {
        case "esmeralda":
            colors=[Color(red:0.94,green:0.31,blue:0.31),Color(red:0.50,green:0.12,blue:0.20)]
        case "arena":
            colors=[Color(red:0.33,green:0.26,blue:0.13),Color(red:0.09,green:0.10,blue:0.13)]
        case "noche":
            colors=[Color(red:0.34,green:0.21,blue:0.57),Color(red:0.10,green:0.08,blue:0.22)]
        default:
            colors=[Color(red:0.18,green:0.49,blue:0.97),Color(red:0.06,green:0.17,blue:0.43)]
        }
        return LinearGradient(colors:colors,startPoint:.topLeading,endPoint:.bottomTrailing)
    }
}
