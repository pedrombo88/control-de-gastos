import Foundation
import SwiftUI
import UniformTypeIdentifiers

struct ReceiptProduct: Codable, Identifiable {
    var id: String = UUID().uuidString
    var name: String
    var amount: Int
    var necessity: String = "pending"
    var quantity: Int? = 1
}

struct Movement: Codable, Identifiable {
    var id: String = UUID().uuidString
    var type: String
    var amount: Int // Céntimos, no Double.
    var date: String
    var title: String
    var category: String
    var method: String? = "card"
    var note: String? = nil
    var receiptItems: [ReceiptProduct]? = nil
    var sourceDocumentIds: [String]? = nil
    var importSource: String? = nil
    var recurringId: String? = nil
    var occurrenceDate: String? = nil
}

struct GoalContribution: Codable, Identifiable {
    var id: String = UUID().uuidString
    var amount: Int
    var date: String
    var note: String = ""
}

struct SavingsGoal: Codable, Identifiable {
    var id: String = UUID().uuidString
    var title: String
    var target: Int
    var dueDate: String
    var createdAt: String
    var contributions: [GoalContribution] = []
    var saved: Int { contributions.reduce(0) { $0 + $1.amount } }
    var remaining: Int { max(0, target - saved) }
    var fraction: Double { target > 0 ? min(1, Double(saved) / Double(target)) : 0 }
}

struct AlertOptions: Codable {
    var enabled: Bool = true
    var threshold: Int = 80
}

struct RecurringRule: Codable, Identifiable {
    var id: String
    var type: String
    var start: String
    var amount: Int
    var title: String
    var category: String
    var frequency: String
    var method: String?
    var active: Bool?
    var from: String?
}

struct OriginalDocument: Codable {
    var id: String
    var name: String
    var type: String
    var size: Int
    var createdAt: String
    var transactionIds: [String]
    var base64: String
}

struct FinanceData: Codable {
    var version: Int = 2
    var transactions: [Movement] = []
    var budgets: [String: Int] = [:]
    var budgetAlerts: AlertOptions = .init()
    var recurring: [RecurringRule] = []
    var recurringSkips: [String] = []
    var savingsGoals: [SavingsGoal] = []
    // Los originales solo se incluyen en la exportación, no en el archivo de datos de uso diario.
    var attachments: [OriginalDocument]? = nil
}

enum FinanceCategory {
    static let expense: [(String,String)] = [
        ("alimentacion","Alimentación"),("hogar","Hogar"),("transporte","Transporte"),
        ("compras","Compras"),("salud","Salud"),("ocio","Ocio"),("educacion","Educación"),
        ("suscripciones","Suscripciones"),("otros","Otros")
    ]
    static let income: [(String,String)] = [
        ("nomina","Nómina"),("extra","Ingresos extra"),("regalos","Regalos"),("otros-ingresos","Otros")
    ]
    static func title(_ id: String) -> String { (expense + income).first(where: {$0.0 == id})?.1 ?? "Otros" }
}

enum FinanceFormat {
    static let euro: NumberFormatter = {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale(identifier: "es_ES")
        f.currencyCode = "EUR"
        return f
    }()
    static func money(_ cents: Int) -> String {
        euro.string(from: NSNumber(value: Double(cents) / 100)) ?? "\(cents) ct"
    }
    static func cents(_ raw: String) -> Int? {
        let cleaned = raw.replacingOccurrences(of: "€", with: "").replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: ".", with: "").replacingOccurrences(of: ",", with: ".")
        guard let n = Double(cleaned), n > 0, n <= 99_999_999.99 else { return nil }
        return Int((n * 100).rounded())
    }
    static func date(_ date: Date = Date()) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier:"en_US_POSIX")
        f.timeZone = TimeZone.current; f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
    static func parsedDate(_ date: String) -> Date {
        let f = DateFormatter(); f.locale = Locale(identifier:"en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"; return f.date(from: date) ?? Date()
    }
}

enum LocalFinanceError: LocalizedError {
    case corrupted,invalidBackup,quotaReached
    var errorDescription: String? {
        switch self {
        case .corrupted: return "Los datos locales no se pueden leer. Restaura una copia antes de continuar."
        case .invalidBackup: return "El archivo no contiene una copia de seguridad compatible."
        case .quotaReached: return "No hay espacio suficiente para guardar la información."
        }
    }
}

@MainActor
final class FinanceStore: ObservableObject {
    @Published private(set) var data = FinanceData()
    @Published var errorMessage: String?
    @Published var showImport = false
    @Published var theme = "oceano"
    private(set) var isCorrupt = false

    private var supportURL: URL {
        let url = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Budviva", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
    private var dataURL: URL { supportURL.appendingPathComponent("finance.json") }
    private var filesURL: URL {
        let url = supportURL.appendingPathComponent("Originales", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    init() {
        theme = UserDefaults.standard.string(forKey: "budviva-theme") ?? "oceano"
        do {
            if FileManager.default.fileExists(atPath: dataURL.path) {
                data = try JSONDecoder().decode(FinanceData.self, from: Data(contentsOf: dataURL))
                data.attachments = nil
            }
        } catch {
            isCorrupt = true
            errorMessage = LocalFinanceError.corrupted.localizedDescription
        }
    }

    var currentMonth: String { String(FinanceFormat.date().prefix(7)) }
    var current: [Movement] { data.transactions.filter { $0.date.hasPrefix(currentMonth) } }
    var income: Int { current.filter { $0.type == "income" }.reduce(0) { $0 + $1.amount } }
    var expense: Int { current.filter { $0.type == "expense" }.reduce(0) { $0 + $1.amount } }
    var balance: Int { income - expense }

    private func persist() throws {
        if isCorrupt { throw LocalFinanceError.corrupted }
        var clean = data; clean.attachments = nil
        let encoded = try JSONEncoder().encode(clean)
        try encoded.write(to: dataURL, options: [.atomic, .completeFileProtection])
        try? FileManager.default.setAttributes([.protectionKey:FileProtectionType.complete], ofItemAtPath:dataURL.path)
        objectWillChange.send()
    }
    func write(_ operation: (inout FinanceData) -> Void) {
        if isCorrupt { errorMessage = LocalFinanceError.corrupted.localizedDescription; return }
        let old = data; operation(&data)
        do { try persist() }
        catch { data = old; errorMessage = error.localizedDescription }
    }
    func save(_ entry: Movement) {
        write { model in
            if let index = model.transactions.firstIndex(where: { $0.id == entry.id }) { model.transactions[index] = entry }
            else { model.transactions.append(entry) }
        }
    }
    func delete(_ id: String) {
        write { $0.transactions.removeAll(where: { $0.id == id }) }
        // Los originales quedan accesibles hasta la siguiente limpieza manual; nunca se borran automáticamente
        // cuando un mismo archivo puede estar vinculado con otros movimientos.
    }
    func setBudget(_ category: String, amount: Int?) {
        write { if let amount, amount > 0 { $0.budgets[category] = amount } else { $0.budgets.removeValue(forKey: category) } }
    }
    func saveGoal(_ goal: SavingsGoal) {
        write {
            if let index = $0.savingsGoals.firstIndex(where: { $0.id == goal.id }) { $0.savingsGoals[index] = goal }
            else { $0.savingsGoals.append(goal) }
        }
    }
    func deleteGoal(_ id: String) { write { $0.savingsGoals.removeAll(where: { $0.id == id }) } }
    func contribute(to goalId: String, amount: Int, note: String = "") {
        guard amount > 0 else { return }
        write { model in
            guard let i = model.savingsGoals.firstIndex(where: { $0.id == goalId }) else { return }
            model.savingsGoals[i].contributions.append(GoalContribution(amount: amount, date: FinanceFormat.date(), note: note))
        }
    }

    func storeOriginal(_ blob: Data, name: String, type: String, movementIDs: [String]) throws -> String {
        guard blob.count <= 15*1024*1024 else { throw LocalFinanceError.quotaReached }
        let id = UUID().uuidString
        let file = filesURL.appendingPathComponent(id, isDirectory: false)
        try blob.write(to: file, options: [.atomic, .completeFileProtection])
        write { model in
            for i in model.transactions.indices where movementIDs.contains(model.transactions[i].id) {
                var refs = model.transactions[i].sourceDocumentIds ?? []
                if !refs.contains(id) { refs.append(id) }
                model.transactions[i].sourceDocumentIds = refs
            }
        }
        return id
    }
    func originalURL(_ id: String) -> URL? {
        let file = filesURL.appendingPathComponent(id)
        return FileManager.default.fileExists(atPath: file.path) ? file : nil
    }

    // Se importan copias JSON antiguas de la PWA y las completas de la nueva app.
    // La restauración es explícita: nunca se fusionan saldos automáticamente.
    func restoreBackup(_ backup: Data) throws {
        let incoming = try JSONDecoder().decode(FinanceData.self, from: backup)
        guard incoming.transactions.count <= 40000, incoming.savingsGoals.count <= 60,
              incoming.transactions.allSatisfy({ $0.amount > 0 && $0.amount <= 9_999_999_999 }),
              incoming.savingsGoals.allSatisfy({ $0.target > 0 }) else {
            throw LocalFinanceError.invalidBackup
        }
        var docs: [(URL,Data)] = []
        for item in incoming.attachments ?? [] {
            guard item.size <= 15*1024*1024,
                  let raw = Data(base64Encoded: item.base64),raw.count == item.size,
                  item.id.range(of: #"^[a-zA-Z0-9_-]{1,150}$"#,options:.regularExpression) != nil
            else { throw LocalFinanceError.invalidBackup }
            docs.append((filesURL.appendingPathComponent(item.id),raw))
        }
        for (url,content) in docs { try content.write(to:url, options:[.atomic,.completeFileProtection]) }
        var next = incoming; next.attachments = nil
        let snapshot = data, wasCorrupt=isCorrupt
        data = next;isCorrupt=false
        do { try persist() }
        catch { data=snapshot;isCorrupt=wasCorrupt;throw error }
    }
    func exportBackup() throws -> Data {
        if isCorrupt { throw LocalFinanceError.corrupted }
        var snapshot = data
        let ids = Set(data.transactions.flatMap { $0.sourceDocumentIds ?? [] })
        snapshot.attachments = try ids.compactMap { id in
            guard let url = originalURL(id) else { return nil }
            let bytes = try Data(contentsOf: url)
            return OriginalDocument(id:id,name:"Original-\(id)",type:"application/octet-stream",size:bytes.count,
                                    createdAt:FinanceFormat.date(),transactionIds:data.transactions.filter { ($0.sourceDocumentIds ?? []).contains(id) }.map(\.id),base64:bytes.base64EncodedString())
        }
        return try JSONEncoder().encode(snapshot)
    }
    func wipe() throws {
        let old = data;data=FinanceData();isCorrupt=false
        do { try persist() }
        catch { data=old;throw error }
        try? FileManager.default.removeItem(at: filesURL)
    }
    func setTheme(_ id: String) { theme=id;UserDefaults.standard.set(id, forKey:"budviva-theme") }
}

struct BackupFile: FileDocument {
    static var readableContentTypes: [UTType] { [.json] }
    var data: Data
    init(data: Data) { self.data=data }
    init(configuration: ReadConfiguration) throws { data=configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents:data) }
}
