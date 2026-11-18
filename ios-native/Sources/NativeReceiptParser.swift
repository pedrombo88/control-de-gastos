import Foundation

/// Extrae productos de tickets españoles a partir de líneas OCR, sin asumir que
/// el importe está al final literal de la línea (muchas cajas añaden IVA A/B/C).
/// No envía los tickets ni los datos de compra a ningún servicio externo.
enum NativeReceiptParser {
    private static let priceAtEnd = try! NSRegularExpression(
        pattern: #"(?<![0-9])([0-9]{0,5}[,.][0-9]{2})(?:\s*€)?(?:\s*[ABC])?\s*$"#,
        options: [.caseInsensitive])
    private static let quantityLine = try! NSRegularExpression(
        pattern: #"^\s*([0-9]{1,2})\s*[x×]\s*([0-9]{1,5}[,.][0-9]{2})(?:\s*€)?(?:\s*[ABC])?\s*$"#,
        options: [.caseInsensitive])
    private static let totalLabel = try! NSRegularExpression(
        pattern: #"(^|[\s€*])(?:TOT|TOTAL|A PAGAR|IMPORTE TOTAL)(?=$|[\s:€*])"#,
        options: [.caseInsensitive])
    private static let dateLabel = try! NSRegularExpression(
        pattern: #"\b[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4}\b"#)

    struct Extraction {
        let items: [ReceiptProduct]
        let total: Int?
        let date: String?
        let merchant: String
    }

    private static func match(_ regex: NSRegularExpression, in text: String) -> NSTextCheckingResult? {
        regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text))
    }

    private static func group(_ match: NSTextCheckingResult, at index: Int,
                              in line: String) -> String? {
        guard index < match.numberOfRanges,
              let range = Range(match.range(at:index), in:line) else { return nil }
        return String(line[range])
    }

    private static func euroCents(_ input: String) -> Int? {
        let normal = input.replacingOccurrences(of:" ",with:"")
        let parts = normal.split(omittingEmptySubsequences:false, whereSeparator:{$0 == "," || $0 == "."})
        guard parts.count == 2, parts[1].count == 2,
              let euros = parts[0].isEmpty ? 0 : Int(parts[0]),
              let cents = Int(parts[1]), euros >= 0 && euros <= 100_000,
              cents >= 0 && cents < 100 else { return nil }
        return euros*100+cents
    }

    private static func cleaned(_ raw: String) -> String {
        raw.replacingOccurrences(of:"\u{00a0}",with:" ")
           .replacingOccurrences(of:"\t",with:" ")
           .trimmingCharacters(in:.whitespacesAndNewlines)
    }

    private static func normalizedLabel(_ value: String) -> String {
        cleaned(value).folding(options:[.diacriticInsensitive,.caseInsensitive],
                               locale:Locale(identifier:"es_ES"))
            .uppercased()
    }

    private static func isAdministrativeLine(_ raw: String) -> Bool {
        let text = normalizedLabel(raw)
        if text.isEmpty { return true }
        let administrative = [
            "FACTURA", "TICKET", "NUM. TOTAL", "NUM TOTAL", "ART. VENDIDOS",
            "TARJETA", "CAMBIO", "EFECTIVO", "SUBTOTAL", "TOTAL",
            "A PAGAR", "IVA", "IMPUESTO", "DESGLOSE", "AHORRO", "GRACIAS",
            "DEVOLUCIONES", "WWW.", "NIF ", "CIF ", "TAX ", "FORMA DE PAGO"
        ]
        return administrative.contains { text.hasPrefix($0) }
    }

    static func extract(_ text: String) -> Extraction {
        let lines = text.components(separatedBy:.newlines)
            .map(cleaned)
            .filter { !$0.isEmpty }
            .prefix(500)

        let merchant = lines.first(where: {
            $0.rangeOfCharacter(from:.letters) != nil && !$0.isEmpty
        }) ?? "Ticket"

        let date: String? = lines.compactMap { line in
            guard let m = match(dateLabel,in:line),
                  let part = group(m,at:0,in:line) else { return nil }
            return NativeImportParser.isoDate(part)
        }.first

        var items:[ReceiptProduct]=[]
        var total:Int?
        var pendingName:String?
        var pendingQuantity:Int?
        var pendingUnitCents:Int?

        for raw in lines {
            // Algunas impresoras sitúan el multiplicador ANTES de la descripción.
            if let quantity = match(quantityLine,in:raw),
               let qtyText = group(quantity,at:1,in:raw),
               let unitText = group(quantity,at:2,in:raw),
               let count = Int(qtyText), count > 0, count <= 99,
               let unit = euroCents(unitText), unit > 0 {
                pendingQuantity=count
                pendingUnitCents=unit
                continue
            }

            if let priceMatch = match(priceAtEnd,in:raw),
               let amountText = group(priceMatch,at:1,in:raw),
               let amount = euroCents(amountText), amount > 0,
               let entirePrice = Range(priceMatch.range,in:raw) {

                let prefix = String(raw[..<entirePrice.lowerBound])
                    .trimmingCharacters(in:.whitespacesAndNewlines)
                let candidate = normalizedLabel(prefix)

                if match(totalLabel,in:raw) != nil {
                    total=amount
                    pendingName=nil
                    pendingQuantity=nil
                    pendingUnitCents=nil
                    continue
                }

                if isAdministrativeLine(candidate) {
                    pendingName=nil
                    continue
                }

                // OCR suele separar la descripción y el importe en dos líneas.
                // No convertir un importe desnudo en un producto "2 x".
                let description: String
                if prefix.rangeOfCharacter(from:.letters) != nil {
                    description=prefix
                } else if let pendingName {
                    description=pendingName
                } else {
                    continue
                }

                let name = cleaned(description)
                guard name.count >= 3,
                      name.rangeOfCharacter(from:.letters) != nil,
                      !isAdministrativeLine(name),
                      items.count < 150 else { continue }

                let count: Int
                if let qty=pendingQuantity, let unit=pendingUnitCents,
                   abs(unit*qty-amount) <= 2 {
                    count=qty
                } else {
                    count=1
                }
                items.append(ReceiptProduct(name:String(name.prefix(100)),amount:amount,
                                            quantity:count))
                pendingName=nil
                pendingQuantity=nil
                pendingUnitCents=nil
                continue
            }

            // Guardar el texto de artículo cuando Vision extrae los nombres
            // y los importes como observaciones separadas.
            if raw.rangeOfCharacter(from:.letters) != nil,
               !isAdministrativeLine(raw),
               match(totalLabel,in:raw) == nil,
               match(dateLabel,in:raw) == nil {
                let clean = cleaned(raw)
                // No arrastrar una cadena larga de publicidad o texto del dorso.
                if clean.count >= 3 && clean.count <= 85 {
                    pendingName=clean
                }
            }
        }

        return Extraction(items:items,total:total,date:date,
                          merchant:String(merchant.prefix(90)))
    }
}
