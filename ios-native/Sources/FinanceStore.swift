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
        let cleaned=raw.replacingOccurrences(of:"€",with:"")
            .replacingOccurrences(of:" ",with:"")
            .replacingOccurrences(of:"\u{00a0}",with:"")
        if cleaned.isEmpty || cleaned.contains("-") || cleaned.contains("+") {return nil}
        let normalized:String
        if cleaned.contains(",") {
            let valid=cleaned.range(of:#"^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$"#,options:.regularExpression) != nil
            guard valid else {return nil}
            normalized=cleaned.replacingOccurrences(of:".",with:"").replacingOccurrences(of:",",with:".")
        } else if cleaned.contains(".") {
            if cleaned.range(of:#"^\d+\.\d{1,2}$"#,options:.regularExpression) != nil {
                normalized=cleaned
            } else if cleaned.range(of:#"^\d{1,3}(\.\d{3})+$"#,options:.regularExpression) != nil {
                normalized=cleaned.replacingOccurrences(of:".",with:"")
            } else {return nil}
        } else {
            guard cleaned.range(of:#"^\d+$"#,options:.regularExpression) != nil else{return nil}
            normalized=cleaned
        }
        guard let decimal=Decimal(string:normalized,locale:Locale(identifier:"en_US_POSIX")),
              decimal > 0,decimal <= Decimal(99_999_999) else{return nil}
        let cents=NSDecimalNumber(decimal:decimal*100)
        guard cents != NSDecimalNumber.notANumber else{return nil}
        return cents.intValue
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
    @Published private(set) var activeAccount: String?

    private var supportURL: URL {
        let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("Budviva", isDirectory: true)
        // El almacén anterior se conserva intacto; las cuentas nuevas quedan aisladas.
        let url: URL
        if let id = activeAccount {
            url = root.appendingPathComponent("Cuentas", isDirectory: true)
                .appendingPathComponent(id, isDirectory: true)
        } else {
            url = root
        }
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }
    private var dataURL: URL { supportURL.appendingPathComponent("finance.json") }
    private var filesURL: URL {supportURL.appendingPathComponent("Originales",isDirectory:true)}
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
                syncRecurring()
            }
        } catch {
            isCorrupt = true
            errorMessage = LocalFinanceError.corrupted.localizedDescription
        }
    }

    /// Cambia de almacén local después de verificar la sesión en Supabase.
    /// No se mezcla información de diferentes cuentas en este iPhone.
    func selectAccount(_ id: String?) {
        let normalized = id?.lowercased()
        guard activeAccount != normalized else { return }
        data = FinanceData()
        isCorrupt = false
        errorMessage = nil
        activeAccount = normalized
        guard let normalized else { return }
        guard UUID(uuidString: normalized) != nil else {
            isCorrupt = true
            errorMessage = "Identificador de cuenta no válido."
            return
        }
        prepareSecurity()
        do {
            if FileManager.default.fileExists(atPath: dataURL.path) {
                data = try JSONDecoder().decode(FinanceData.self, from: Data(contentsOf: dataURL))
                data.attachments = nil
                syncRecurring()
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
    /// Comunicar los errores de persistencia al formulario evita cerrar una edición
    /// cuyo movimiento no se haya podido guardar realmente en el dispositivo.
    @discardableResult
    func write(_ operation: (inout FinanceData) -> Void) -> Bool {
        if isCorrupt { errorMessage = LocalFinanceError.corrupted.localizedDescription; return false }
        let old = data; operation(&data)
        do { try persist(); return true }
        catch { data = old; errorMessage = error.localizedDescription; return false }
    }
    @discardableResult
    func save(_ entry: Movement) -> Bool {
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
        guard data.transactions.first(where:{$0.id==id}) == nil else{return}
        let referenced=Set(data.transactions.flatMap{$0.sourceDocumentIds ?? []})
        let orphaned=(entry?.sourceDocumentIds ?? []).filter{!referenced.contains($0)}
        guard !orphaned.isEmpty else{return}
        for docId in orphaned {
            if let path=originalURL(docId){try? FileManager.default.removeItem(at:path)}
        }
        if var metadata=try? JSONDecoder().decode([OriginalDocument].self,from:Data(contentsOf:originalMetadataURL)) {
            metadata.removeAll{orphaned.contains($0.id)}
            if let bytes=try? JSONEncoder().encode(metadata) {
                try? bytes.write(to:originalMetadataURL,options:[.atomic,.completeFileProtection])
            }
        }
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
        guard !isCorrupt else {throw LocalFinanceError.corrupted}
        guard blob.count > 0,blob.count <= 15*1024*1024 else {throw LocalFinanceError.quotaReached}
        let id=UUID().uuidString
        try FileManager.default.createDirectory(at:filesURL,withIntermediateDirectories:true)
        let file=filesURL.appendingPathComponent(id)
        try blob.write(to:file,options:[.atomic,.completeFileProtection])
        let previous=data
        for i in data.transactions.indices where movementIDs.contains(data.transactions[i].id) {
            var refs=data.transactions[i].sourceDocumentIds ?? []
            if !refs.contains(id) {refs.append(id)}
            data.transactions[i].sourceDocumentIds=refs
        }
        do {try persist()}
        catch {
            data=previous
            try? FileManager.default.removeItem(at:file)
            throw error
        }
        let metadata=OriginalDocument(id:id,name:String(name.prefix(160)),type:String(type.prefix(100)),
             size:blob.count,createdAt:FinanceFormat.date(),transactionIds:movementIDs,base64:"")
        var info=(try? JSONDecoder().decode([OriginalDocument].self,
                    from:Data(contentsOf:originalMetadataURL))) ?? []
        info.append(metadata)
        if let encoded=try? JSONEncoder().encode(info) {
            try? encoded.write(to:originalMetadataURL,options:[.atomic,.completeFileProtection])
        }
        return id
    }
    private var originalMetadataURL: URL {supportURL.appendingPathComponent("Originales-index.json")}
    /// Importación transaccional: si falla el archivo o el JSON, no queda ningún movimiento a medias.
    func importMovements(_ entries:[Movement],withOriginal bytes:Data,name:String,type:String) throws {
        guard !isCorrupt else{throw LocalFinanceError.corrupted}
        guard !entries.isEmpty,!bytes.isEmpty,bytes.count<=15*1024*1024 else{throw LocalFinanceError.invalidBackup}
        let id=UUID().uuidString
        try FileManager.default.createDirectory(at:filesURL,withIntermediateDirectories:true)
        let path=filesURL.appendingPathComponent(id)
        let previous=data,previousMeta=try? Data(contentsOf:originalMetadataURL)
        try bytes.write(to:path,options:[.atomic,.completeFileProtection])
        do {
            var enriched=entries
            for i in enriched.indices {
                var refs=enriched[i].sourceDocumentIds ?? []
                refs.append(id)
                enriched[i].sourceDocumentIds=refs
            }
            data.transactions.append(contentsOf:enriched)
            let meta=OriginalDocument(id:id,name:String(name.prefix(160)),type:String(type.prefix(100)),
                size:bytes.count,createdAt:FinanceFormat.date(),
                transactionIds:entries.map(\.id),base64:"")
            var allMeta=(try? JSONDecoder().decode([OriginalDocument].self,
                from:Data(contentsOf:originalMetadataURL))) ?? []
            allMeta.append(meta)
            let indexJSON=try JSONEncoder().encode(allMeta)
            try indexJSON.write(to:originalMetadataURL,options:[.atomic,.completeFileProtection])
            try persist()
        }catch {
            data=previous
            try? FileManager.default.removeItem(at:path)
            if let previousMeta {try? previousMeta.write(to:originalMetadataURL,options:[.atomic,.completeFileProtection])}
            else {try? FileManager.default.removeItem(at:originalMetadataURL)}
            throw error
        }
    }

    /// Prepara una copia temporal con su extensión para QuickLook y compartir.
    func previewOriginal(_ id:String) throws -> URL {
        guard let source=originalURL(id) else{throw LocalFinanceError.invalidBackup}
        let metadata=(try? JSONDecoder().decode([OriginalDocument].self,
            from:Data(contentsOf:originalMetadataURL))) ?? []
        let name=metadata.first(where:{$0.id==id})?.name ?? "Original"
        let suffix=URL(fileURLWithPath:name).pathExtension.lowercased()
        let supported=["pdf","jpg","jpeg","png","webp","bmp","csv","txt"]
        let ext=supported.contains(suffix) ? suffix:"bin"
        let temp=FileManager.default.temporaryDirectory.appendingPathComponent("budviva-"+UUID().uuidString+"."+ext)
        try FileManager.default.copyItem(at:source,to:temp)
        return temp
    }

    func originalURL(_ id: String) -> URL? {
        let file = filesURL.appendingPathComponent(id)
        return FileManager.default.fileExists(atPath: file.path) ? file : nil
    }

    // Compatibilidad de copias JSON PWA / iOS con y sin archivos adjuntos.
    // El modelo solo se reemplaza tras preparar los originales y guardar el JSON.
    func restoreBackup(_ backup:Data) throws {
        guard backup.count <= 110*1024*1024 else {throw LocalFinanceError.invalidBackup}
        let incoming=try JSONDecoder().decode(FinanceData.self,from:backup)
        guard incoming.transactions.count<=40000,incoming.savingsGoals.count<=60,
              incoming.transactions.allSatisfy({$0.amount>0 && $0.amount<=9_999_999_999}),
              incoming.savingsGoals.allSatisfy({$0.target>0}) else{
            throw LocalFinanceError.invalidBackup
        }
        let docs=incoming.attachments ?? []
        let hasOriginals=incoming.attachments != nil
        guard docs.count<=200,docs.allSatisfy({
              $0.size>0 && $0.size<=15*1024*1024 &&
              $0.id.range(of:#"^[a-zA-Z0-9_-]{1,150}$"#,options:.regularExpression) != nil
        }),docs.reduce(0,{$0+$1.size})<=75*1024*1024 else{
            throw LocalFinanceError.invalidBackup
        }

        var next=incoming
        next.attachments=nil
        if !hasOriginals {
            // Las copias antiguas no tienen originales: evitar referencias huérfanas.
            for i in next.transactions.indices {next.transactions[i].sourceDocumentIds=nil}
        }
        let ids=Set(docs.map(\.id))
        guard ids.count==docs.count,
              next.transactions.flatMap({$0.sourceDocumentIds ?? []}).allSatisfy({ids.contains($0)}) else {
            throw LocalFinanceError.invalidBackup
        }
        let fm=FileManager.default
        let stage=supportURL.appendingPathComponent("stage-"+UUID().uuidString,isDirectory:true)
        let oldFolder=supportURL.appendingPathComponent("old-"+UUID().uuidString,isDirectory:true)
        try fm.createDirectory(at:stage,withIntermediateDirectories:true)
        defer {if fm.fileExists(atPath:stage.path){try? fm.removeItem(at:stage)}}
        for item in docs {
            guard let original=Data(base64Encoded:item.base64),original.count==item.size else {
                throw LocalFinanceError.invalidBackup
            }
            try original.write(to:stage.appendingPathComponent(item.id),options:[.atomic,.completeFileProtection])
        }

        let encoded=try JSONEncoder().encode(next)
        let metadata=docs.map { d in
            OriginalDocument(id:d.id,name:d.name,type:d.type,size:d.size,
                createdAt:d.createdAt,transactionIds:d.transactionIds,base64:"")
        }
        let metadataJSON=try JSONEncoder().encode(metadata)
        let oldMetadata=try? Data(contentsOf:originalMetadataURL)
        let oldFinance=try? Data(contentsOf:dataURL)
        let oldData=data,oldCorrupt=isCorrupt
        var movedOld=false,movedNew=false
        do {
            if fm.fileExists(atPath:filesURL.path) {
                try fm.moveItem(at:filesURL,to:oldFolder)
                movedOld=true
            }
            try fm.moveItem(at:stage,to:filesURL)
            movedNew=true
            try metadataJSON.write(to:originalMetadataURL,options:[.atomic,.completeFileProtection])
            try encoded.write(to:dataURL,options:[.atomic,.completeFileProtection])
            data=next;isCorrupt=false;objectWillChange.send()
            if movedOld {try? fm.removeItem(at:oldFolder)}
        }catch{
            if movedNew {try? fm.removeItem(at:filesURL)}
            if movedOld {try? fm.moveItem(at:oldFolder,to:filesURL)}
            if let oldMetadata {try? oldMetadata.write(to:originalMetadataURL,options:[.atomic,.completeFileProtection])}
            else {try? fm.removeItem(at:originalMetadataURL)}
            if let oldFinance {try? oldFinance.write(to:dataURL,options:[.atomic,.completeFileProtection])}
            else {try? fm.removeItem(at:dataURL)}
            data=oldData;isCorrupt=oldCorrupt
            throw error
        }
    }

    func exportBackup() throws -> Data {
        if isCorrupt {throw LocalFinanceError.corrupted}
        var snapshot=data
        let ids=Set(data.transactions.flatMap{$0.sourceDocumentIds ?? []})
        let metadata=(try? JSONDecoder().decode([OriginalDocument].self,
             from:Data(contentsOf:originalMetadataURL))) ?? []
        var docs=[OriginalDocument](),totalBytes=0
        for id in ids.sorted() {
            guard let url=originalURL(id) else{
                throw LocalFinanceError.invalidBackup
            }
            let bytes=try Data(contentsOf:url)
            totalBytes+=bytes.count
            guard bytes.count<=15*1024*1024,totalBytes<=75*1024*1024 else{
                throw LocalFinanceError.quotaReached
            }
            let meta=metadata.first(where:{$0.id==id})
            docs.append(OriginalDocument(id:id,name:meta?.name ?? "Original-"+id,
                type:meta?.type ?? "application/octet-stream",size:bytes.count,
                createdAt:meta?.createdAt ?? FinanceFormat.date(),
                transactionIds:data.transactions.filter{($0.sourceDocumentIds ?? []).contains(id)}.map(\.id),
                base64:bytes.base64EncodedString()))
        }
        snapshot.attachments=docs
        return try JSONEncoder().encode(snapshot)
    }
    /// Conserva el archivo original incluso cuando no puede descodificarse.
    /// No modifica ni borra el almacén actual.
    func exportEmergencyData() throws -> Data {
        guard isCorrupt, FileManager.default.fileExists(atPath:dataURL.path) else {
            throw LocalFinanceError.invalidBackup
        }
        let properties=try FileManager.default.attributesOfItem(atPath:dataURL.path)
        let bytes=(properties[.size] as? NSNumber)?.int64Value ?? 0
        guard bytes>0, bytes<=110*1024*1024 else {throw LocalFinanceError.invalidBackup}
        return try Data(contentsOf:dataURL)
    }
    func wipe() throws {
        let saved=data,wasCorrupt=isCorrupt
        let empty=try JSONEncoder().encode(FinanceData())
        try empty.write(to:dataURL,options:[.atomic,.completeFileProtection])
        do {
            if FileManager.default.fileExists(atPath:filesURL.path) {
                try FileManager.default.removeItem(at:filesURL)
            }
            if FileManager.default.fileExists(atPath:originalMetadataURL.path) {
                try FileManager.default.removeItem(at:originalMetadataURL)
            }
            data=FinanceData();isCorrupt=false;objectWillChange.send()
        }catch {
            data=saved;isCorrupt=wasCorrupt
            if !wasCorrupt {try? JSONEncoder().encode(saved).write(to:dataURL,options:[.atomic,.completeFileProtection])}
            throw error
        }
    }
    func setTheme(_ id: String) { theme=id;UserDefaults.standard.set(id, forKey:"budviva-theme") }
}

struct BackupFile: FileDocument {
    static var readableContentTypes: [UTType] { [.json,.data,.plainText] }
    static var writableContentTypes: [UTType] { [.json,.data,.plainText] }
    var data: Data
    init(data: Data) { self.data=data }
    init(configuration: ReadConfiguration) throws { data=configuration.file.regularFileContents ?? Data() }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper { FileWrapper(regularFileWithContents:data) }
}
