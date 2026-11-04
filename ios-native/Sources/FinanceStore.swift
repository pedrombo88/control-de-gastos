import Foundation
import SwiftUI
import UniformTypeIdentifiers

struct ReceiptProduct: Codable, Identifiable {
    var id: String = UUID().uuidString
    var name: String
    var amount: Int
    var necessity: String = "pending"
    var quantity: Int? = 1

    enum CodingKeys: String, CodingKey { case id,name,amount,necessity,quantity }
    init(from decoder:Decoder)throws{
        let box=try decoder.container(keyedBy:CodingKeys.self)
        id=try box.decodeIfPresent(String.self,forKey:.id) ?? UUID().uuidString
        name=try box.decode(String.self,forKey:.name)
        amount=try box.decode(Int.self,forKey:.amount)
        necessity=try box.decodeIfPresent(String.self,forKey:.necessity) ?? "pending"
        quantity=try box.decodeIfPresent(Int.self,forKey:.quantity) ?? 1
    }
    init(id:String=UUID().uuidString,name:String,amount:Int,necessity:String="pending",quantity:Int?=1){
        self.id=id;self.name=name;self.amount=amount;self.necessity=necessity;self.quantity=quantity
    }
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
    enum CodingKeys:String,CodingKey { case enabled,threshold }
    init() {}
    init(from decoder:Decoder)throws{
        let box=try decoder.container(keyedBy:CodingKeys.self)
        enabled=try box.decodeIfPresent(Bool.self,forKey:.enabled) ?? true
        threshold=try box.decodeIfPresent(Int.self,forKey:.threshold) ?? 80
    }
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
    var attachments: [OriginalDocument]? = nil

    enum CodingKeys: String,CodingKey {
        case version,transactions,budgets,budgetAlerts,recurring,recurringSkips,savingsGoals,attachments
    }
    init() {}
    init(from decoder:Decoder)throws{
        let box=try decoder.container(keyedBy:CodingKeys.self)
        version=try box.decodeIfPresent(Int.self,forKey:.version) ?? 2
        transactions=try box.decode([Movement].self,forKey:.transactions)
        budgets=try box.decodeIfPresent([String:Int].self,forKey:.budgets) ?? [:]
        budgetAlerts=try box.decodeIfPresent(AlertOptions.self,forKey:.budgetAlerts) ?? AlertOptions()
        recurring=try box.decodeIfPresent([RecurringRule].self,forKey:.recurring) ?? []
        recurringSkips=try box.decodeIfPresent([String].self,forKey:.recurringSkips) ?? []
        savingsGoals=try box.decodeIfPresent([SavingsGoal].self,forKey:.savingsGoals) ?? []
        attachments=try box.decodeIfPresent([OriginalDocument].self,forKey:.attachments)
    }
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
    func prepareSecurity() {
        try? FileManager.default.setAttributes([.protectionKey:FileProtectionType.complete],ofItemAtPath:supportURL.path)
    }

    init() {
        theme = UserDefaults.standard.string(forKey: "budviva-theme") ?? "oceano"
        prepareSecurity()
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
        let entry=data.transactions.first(where:{$0.id == id})
        write { model in
            model.transactions.removeAll(where:{$0.id == id})
            if let rule=entry?.recurringId,let date=entry?.occurrenceDate {
                let marker=rule+"|"+date
                if !model.recurringSkips.contains(marker){model.recurringSkips.append(marker)}
            }
        }
        // Los originales pueden compartirse; se conservan hasta una limpieza específica.
    }
    func saveRecurring(_ rule:RecurringRule) {
        write { model in
            if let i=model.recurring.firstIndex(where:{$0.id==rule.id}) {model.recurring[i]=rule}
            else {model.recurring.append(rule)}
        }
        syncRecurring()
    }
    func removeRecurring(_ id:String) { write{$0.recurring.removeAll{$0.id==id}} }
    func syncRecurring() {
        if isCorrupt || data.recurring.isEmpty {return}
        let today=FinanceFormat.date()
        let limit=FinanceFormat.date(Calendar.current.date(byAdding:.year,value:-2,to:Date()) ?? Date())
        let previous=Set(data.transactions.compactMap { mov -> String? in
            guard let rule=mov.recurringId,let date=mov.occurrenceDate else{return nil}
            return rule+"|"+date
        })
        let skipped=Set(data.recurringSkips)
        var created=[Movement](),seen=previous
        for rule in data.recurring {
            if rule.active == false || rule.start > today {continue}
            let start=FinanceFormat.parsedDate(rule.start)
            let minimum=rule.from ?? rule.start
            var index=0
            while index<800 && created.count<1500 {
                let next:Date?
                switch rule.frequency {
                case "daily":next=Calendar.current.date(byAdding:.day,value:index,to:start)
                case "weekly":next=Calendar.current.date(byAdding:.day,value:index*7,to:start)
                case "monthly":next=Calendar.current.date(byAdding:.month,value:index,to:start)
                case "yearly":next=Calendar.current.date(byAdding:.year,value:index,to:start)
                default:next=nil
                }
                guard let date=next else{break}
                let key=FinanceFormat.date(date)
                if key > today {break}
                let candidate=rule.id+"|"+key
                if key >= limit && key >= minimum && !seen.contains(candidate) && !skipped.contains(candidate) {
                    created.append(Movement(type:rule.type,amount:rule.amount,date:key,title:rule.title,
                        category:rule.category,method:rule.method ?? "card",note:"Movimiento recurrente",
                        recurringId:rule.id,occurrenceDate:key))
                    seen.insert(candidate)
                }
                index+=1
            }
        }
        if !created.isEmpty {write{$0.transactions.append(contentsOf:created)}}
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
