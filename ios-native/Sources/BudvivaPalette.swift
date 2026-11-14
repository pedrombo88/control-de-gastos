import SwiftUI

/// Sistema visual de marca: paletas con personalidad, contrastes y superficies propios.
/// Se mantienen los identificadores de los temas existentes para no perder la selección.
struct BudvivaPalette {
    static let themes = ["oceano", "esmeralda", "arena", "noche"]
    let id: String
    init(_ id: String) { self.id = Self.themes.contains(id) ? id : "oceano" }

    var accent: Color {
        switch id {
        case "esmeralda": return Color(red: 0.20, green: 0.41, blue: 0.30) // oliva profundo
        case "arena": return Color(red: 0.58, green: 0.29, blue: 0.22) // terracota
        case "noche": return Color(red: 0.84, green: 0.70, blue: 0.52) // latón suave
        default: return Color(red: 0.15, green: 0.38, blue: 0.53) // atlántico
        }
    }

    var canvas: Color {
        switch id {
        case "esmeralda": return Color(red: 0.95, green: 0.96, blue: 0.92)
        case "arena": return Color(red: 0.99, green: 0.96, blue: 0.93)
        case "noche": return Color(red: 0.07, green: 0.08, blue: 0.09)
        default: return Color(red: 0.94, green: 0.96, blue: 0.97)
        }
    }

    var surface: Color {
        switch id {
        case "esmeralda": return Color(red: 0.995, green: 0.997, blue: 0.975)
        case "arena": return Color(red: 1.0, green: 0.99, blue: 0.97)
        case "noche": return Color(red: 0.15, green: 0.16, blue: 0.17)
        default: return Color.white
        }
    }

    var soft: Color {
        switch id {
        case "esmeralda": return Color(red: 0.87, green: 0.91, blue: 0.82)
        case "arena": return Color(red: 0.97, green: 0.88, blue: 0.83)
        case "noche": return Color(red: 0.22, green: 0.22, blue: 0.21)
        default: return Color(red: 0.85, green: 0.91, blue: 0.93)
        }
    }

    var hero: LinearGradient {
        let shades: [Color]
        switch id {
        case "esmeralda":
            shades = [
                Color(red:0.23,green:0.36,blue:0.27),
                Color(red:0.12,green:0.22,blue:0.18)
            ]
        case "arena":
            shades = [
                Color(red:0.59,green:0.30,blue:0.23),
                Color(red:0.34,green:0.21,blue:0.20)
            ]
        case "noche":
            shades = [
                Color(red:0.30,green:0.29,blue:0.26),
                Color(red:0.13,green:0.14,blue:0.14)
            ]
        default:
            shades = [
                Color(red:0.15,green:0.37,blue:0.47),
                Color(red:0.08,green:0.19,blue:0.29)
            ]
        }
        return LinearGradient(colors: shades, startPoint: .topLeading, endPoint: .bottomTrailing)
    }
}
