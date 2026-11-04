import SwiftUI
import UniformTypeIdentifiers
import PDFKit
import Vision
import UIKit

struct ImportDraft: Identifiable {
    var id = UUID()
    var date: String
    var title: String
    var amount: String
    var type: String
    var category: String
    var items: [ReceiptProduct] = []
    var selected = false
}

enum NativeImportParser {
    static func isoDate(_ input: String) -> String? {
        let value=input.trimmingCharacters(in:.whitespaces)
        let segments=value.split(whereSeparator:{$0 == "/" || $0 == "-" || $0 == "."}).map(String.init)
        if segments.count != 3 { return nil }
        var y=0,m=0,d=0
        if segments[0].count == 4 {
            y=Int(segments[0]) ?? 0;m=Int(segments[1]) ?? 0;d=Int(segments[2]) ?? 0
        } else {
            d=Int(segments[0]) ?? 0;m=Int(segments[1]) ?? 0;y=Int(segments[2]) ?? 0
            if y < 100 { y += y >= 70 ? 1900:2000 }
        }
        guard (2000...2100).contains(y),(1...12).contains(m),(1...31).contains(d),
              let date=Calendar(identifier:.gregorian).date(from:DateComponents(year:y,month:m,day:d)),
              Calendar(identifier:.gregorian).dateComponents([.year,.month,.day],from:date).day == d
        else {return nil}
        return String(format:"%04d-%02d-%02d",y,m,d)
    }
    static func cents(_ text:String)->Int? {
        let clean=text.replacingOccurrences(of:"€",with:"").replacingOccurrences(of:" ",with:"")
        if clean.isEmpty {return nil}
        let negative=clean.hasPrefix("-") || clean.hasPrefix("−") || clean.hasSuffix("-") || (clean.hasPrefix("(") && clean.hasSuffix(")"))
        let absolute=clean.replacingOccurrences(of:"-",with:"").replacingOccurrences(of:"−",with:"")
            .replacingOccurrences(of:"(",with:"").replacingOccurrences(of:")",with:"")
        guard let c=FinanceFormat.cents(absolute) else{return nil}
        return negative ? -c:c
    }
    static func csvCells(_ line:String, delimiter:Character)->[String] {
        var cells=[String](),word="",quoted=false
        let chars=Array(line);var i=0
        while i<chars.count {
            let c=chars[i]
            if c == "\"" {
                if quoted && i+1<chars.count && chars[i+1] == "\"" {word.append("\"");i+=1}
                else {quoted.toggle()}
            } else if c == delimiter && !quoted {cells.append(word.trimmingCharacters(in:.whitespaces));word=""}
            else {word.append(c)}
            i+=1
        }
        cells.append(word.trimmingCharacters(in:.whitespaces));return cells
    }
    static func parseCSV(_ input:String)->[ImportDraft] {
        let lines=input.replacingOccurrences(of:"\u{FEFF}",with:"")
            .components(separatedBy:.newlines).filter{!$0.trimmingCharacters(in:.whitespaces).isEmpty}
        guard lines.count>1 else{return []}
        let possible:[Character]=[";","\t",","]
        let delimiter=possible.max(by:{first,second in lines[0].filter{$0==first}.count < lines[0].filter{$0==second}.count}) ?? ";"
        let header=csvCells(lines[0],delimiter:delimiter).map{$0.folding(options:[.diacriticInsensitive,.caseInsensitive],locale:Locale(identifier:"es_ES")).lowercased().replacingOccurrences(of:" ",with:"")}
        func idx(_ names:[String])->Int? {header.firstIndex(where:{v in names.contains(where:{v==$0 || v.hasPrefix($0)})})}
        guard let d=idx(["fecha","date"]),let n=idx(["concepto","descripcion","detalle","movimiento","description","comercio"]) else{return []}
        let amountI=idx(["importe","amount","cantidad"]),debitI=idx(["cargo","debe","debito","debit"]),creditI=idx(["abono","haber","credito","credit"])
        if amountI==nil && (debitI==nil || creditI==nil){return []}
        return lines.dropFirst().prefix(2000).compactMap{line in
            let fields=csvCells(line,delimiter:delimiter)
            func field(_ i:Int?)->String {guard let i,i<fields.count else{return ""};return fields[i]}
            guard let date=isoDate(field(d)),!field(n).isEmpty else{return nil}
            let value:Int?
            if let i=amountI {value=cents(field(i))}
            else {
                let credit=cents(field(creditI)) ?? 0, debit=cents(field(debitI)) ?? 0
                value=credit != 0 ? abs(credit):debit != 0 ? -abs(debit):nil
            }
            guard let value,value != 0 else{return nil}
            let type=value<0 ? "expense":"income"
            return ImportDraft(date:date,title:String(field(n).prefix(90)),amount:String(format:"%.2f",Double(abs(value))/100).replacingOccurrences(of:".",with:","),type:type,
                category:type=="expense" ? "otros":"otros-ingresos")
        }
    }
    static func parseTicket(_ text:String)->[ImportDraft] {
        let rows=text.components(separatedBy:.newlines).map{$0.trimmingCharacters(in:.whitespaces)}.filter{!$0.isEmpty}
        let priceRegex=try! NSRegularExpression(pattern:#"(-?\d{1,6}[,.]\d{2})\s*€?\s*$"#)
        let dateRegex=try! NSRegularExpression(pattern:#"\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b"#)
        let date=rows.compactMap{line->String? in
            let range=NSRange(line.startIndex...,in:line)
            guard let match=dateRegex.firstMatch(in:line,range:range),let sub=Range(match.range,in:line) else {return nil}
            return isoDate(String(line[sub]))
        }.first ?? FinanceFormat.date()
        var items=[ReceiptProduct](),total:Int?
        for line in rows {
            let range=NSRange(line.startIndex...,in:line)
            guard let match=priceRegex.firstMatch(in:line,range:range),
                  let price=Range(match.range(at:1),in:line),let whole=Range(match.range,in:line),
                  let value=cents(String(line[price])),value>0 else{continue}
            if line.uppercased().contains("TOTAL") || line.uppercased().contains("A PAGAR") {
                total=value;continue
            }
            let name=String(line[..<whole.lowerBound]).trimmingCharacters(in:.whitespaces)
            if name.count>2 && !name.uppercased().contains("IVA") && !name.uppercased().contains("SUBTOTAL")
                && !name.uppercased().contains("EFECTIVO") && !name.uppercased().contains("TARJETA") && items.count<120 {
                items.append(ReceiptProduct(name:String(name.prefix(90)),amount:value))
            }
        }
        let amount=total ?? items.reduce(0){$0+$1.amount}
        guard amount>0 else{return []}
        let title=rows.first(where:{$0.rangeOfCharacter(from:.letters) != nil}) ?? "Ticket"
        return [ImportDraft(date:date,title:String(title.prefix(90)),amount:String(format:"%.2f",Double(amount)/100).replacingOccurrences(of:".",with:","),
                            type:"expense",category:"otros",items:items)]
    }
    static func parseStatementText(_ text:String)->[ImportDraft] {
        let rx=try! NSRegularExpression(pattern:#"^\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})\s+(.+?)\s+(-?\d{1,9}[,.]\d{2})\s*€?\s*$"#)
        return text.components(separatedBy:.newlines).prefix(2000).compactMap { line in
            let ns=NSRange(line.startIndex...,in:line)
            guard let m=rx.firstMatch(in:line,range:ns),m.numberOfRanges>=4,
              let dateR=Range(m.range(at:1),in:line),
              let titleR=Range(m.range(at:2),in:line),
              let amountR=Range(m.range(at:3),in:line),
              let date=isoDate(String(line[dateR])),let cents=cents(String(line[amountR])),cents != 0
            else{return nil}
            let type=cents<0 ? "expense":"income"
            return ImportDraft(date:date,title:String(line[titleR].prefix(90)),amount:String(format:"%.2f",Double(abs(cents))/100).replacingOccurrences(of:".",with:","),
                type:type,category:type=="expense" ? "otros":"otros-ingresos")
        }
    }
    static func text(from data:Data,fileExtension ext:String)throws -> String {
        if ext=="csv" || ext=="txt" {
            guard let text=String(data:data,encoding:.utf8) ?? String(data:data,encoding:.windowsCP1252) else{
                throw NSError(domain:"Budviva",code:1,userInfo:[NSLocalizedDescriptionKey:"No se pudo leer el archivo de texto."])
            }
            return text
        }
        if ext=="pdf" {
            guard let doc=PDFDocument(data:data) else{throw NSError(domain:"Budviva",code:2,userInfo:[NSLocalizedDescriptionKey:"PDF inválido."])}
            if doc.pageCount>30 {throw NSError(domain:"Budviva",code:3,userInfo:[NSLocalizedDescriptionKey:"Máximo 30 páginas."])}
            var lines=[String]()
            for n in 0..<doc.pageCount {
                guard let page=doc.page(at:n) else{continue}
                if let text=page.string,text.trimmingCharacters(in:.whitespacesAndNewlines).count>20 {lines.append(text)}
                else {
                    if doc.pageCount>10 {throw NSError(domain:"Budviva",code:4,userInfo:[NSLocalizedDescriptionKey:"PDF escaneado: máximo 10 páginas."])}
                    let image=page.thumbnail(of:CGSize(width:1500,height:1900),for:.mediaBox)
                    if let cg=image.cgImage {lines.append(try vision(cg))}
                }
            }
            return lines.joined(separator:"\n")
        }
        guard let image=UIImage(data:data),let cg=image.cgImage else {
            throw NSError(domain:"Budviva",code:5,userInfo:[NSLocalizedDescriptionKey:"Imagen incompatible."])
        }
        return try vision(cg)
    }
    static func vision(_ image:CGImage)throws->String{
        let req=VNRecognizeTextRequest()
        req.recognitionLevel = .accurate;req.recognitionLanguages=["es-ES","en-US"]
        req.usesLanguageCorrection=true
        try VNImageRequestHandler(cgImage:image).perform([req])
        return (req.results ?? []).compactMap{$0.topCandidates(1).first?.string}.joined(separator:"\n")
    }
}

struct ImportScreen: View {
    @EnvironmentObject var store:FinanceStore
    @State private var showingPicker=false
    @State private var showingCamera=false
    @State private var cameraUnavailable=false
    @State private var mode="ticket"
    @State private var drafts=[ImportDraft]()
    @State private var rawData:Data?
    @State private var name=""
    @State private var type=""
    @State private var busy=false
    @State private var message="Selecciona una imagen, un PDF o un CSV para analizarlo sin subirlo a Internet."
    @State private var isError=false
    var body:some View {
        ScrollView {
            VStack(alignment:.leading,spacing:17) {
                Picker("Contenido",selection:$mode){
                    Text("Ticket").tag("ticket");Text("Extracto bancario").tag("statement")
                }.pickerStyle(.segmented)
                Button { showingPicker=true } label: { Label("Seleccionar documento",systemImage:"doc.text.viewfinder").frame(maxWidth:.infinity) }
                    .buttonStyle(.borderedProminent)
                if mode=="ticket" {
                    Button {
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {showingCamera=true}
                        else {cameraUnavailable=true}
                    } label: { Label("Hacer foto del ticket",systemImage:"camera").frame(maxWidth:.infinity) }
                    .buttonStyle(.bordered)
                }
                if busy {ProgressView("Analizando documento…")}
                Text(message).font(.caption).foregroundStyle(isError ? .red:.secondary)
                if !drafts.isEmpty {
                    Text("Movimientos propuestos (\(drafts.count))").font(.headline)
                    Text("Revisa cada operación. Los importes, fechas y productos extraídos pueden ser incorrectos. Nada se guarda automáticamente.")
                        .font(.caption).foregroundStyle(.secondary)
                    ForEach($drafts) { $draft in
                        GroupBox {
                            VStack(alignment:.leading,spacing:9){
                                Toggle("Incluir este movimiento",isOn:$draft.selected)
                                TextField("Concepto",text:$draft.title)
                                TextField("Importe (€)",text:$draft.amount).keyboardType(.decimalPad)
                                TextField("Fecha (aaaa-mm-dd)",text:$draft.date)
                                Picker("Tipo",selection:$draft.type){
                                    Text("Gasto").tag("expense");Text("Ingreso").tag("income")
                                }
                                Picker("Categoría",selection:$draft.category) {
                                    ForEach((draft.type=="income" ? FinanceCategory.income:FinanceCategory.expense).indices,id:\.self) { i in
                                        let cat=(draft.type=="income" ? FinanceCategory.income:FinanceCategory.expense)[i]
                                        Text(cat.1).tag(cat.0)
                                    }
                                }
                                if !draft.items.isEmpty {
                                    DisclosureGroup("Productos (\(draft.items.count))"){
                                        ForEach($draft.items) { $item in
                                            HStack {
                                                VStack(alignment:.leading) {
                                                    Text(item.name).font(.caption)
                                                    Text(FinanceFormat.money(item.amount)).font(.caption2).foregroundStyle(.secondary)
                                                }
                                                Spacer()
                                                Picker("Necesidad",selection:$item.necessity){
                                                    Text("Pendiente").tag("pending")
                                                    Text("Necesario").tag("necessary")
                                                    Text("No necesario").tag("optional")
                                                }.labelsHidden()
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    Button("Guardar movimientos seleccionados"){save()}
                        .buttonStyle(.borderedProminent).frame(maxWidth:.infinity)
                }
            }.padding(16)
        }
        .navigationTitle("Importar")
        .fileImporter(isPresented:$showingPicker,allowedContentTypes:[.pdf,.image,.commaSeparatedText,.plainText],allowsMultipleSelection:false) {result in
            switch result {
            case .success(let files):if let first=files.first {load(first)}
            case .failure(let e):message=e.localizedDescription;isError=true
            }
        }
        .sheet(isPresented:$showingCamera) {
            CameraCapture { data in
                analyze(data,name:"ticket-"+FinanceFormat.date()+".jpg",ext:"jpg")
            }
            .ignoresSafeArea()
        }
        .alert("Cámara no disponible",isPresented:$cameraUnavailable){
            Button("Aceptar",role:.cancel){}
        } message:{Text("La cámara no está disponible en este dispositivo o simulador. Puedes seleccionar una fotografía guardada.")}

    }
    private func load(_ url:URL) {
        let granted=url.startAccessingSecurityScopedResource()
        defer {if granted {url.stopAccessingSecurityScopedResource()}}
        do {
            try analyze(Data(contentsOf:url),name:url.lastPathComponent,ext:url.pathExtension.lowercased())
        }catch {
            message=error.localizedDescription;isError=true;busy=false
        }
    }
    private func analyze(_ data:Data,name filename:String,ext extensionName:String) {
        guard !busy else{return}
        guard data.count<=15*1024*1024 else {
            message="Máximo 15 MB por documento.";isError=true;return
        }
        rawData=data;name=filename;type=extensionName
        busy=true;isError=false;drafts=[];message="Analizando "+filename+"…"
        let current=mode
        let ext=extensionName
        Task.detached(priority:.userInitiated) {
            do {
                let text=try NativeImportParser.text(from:data,fileExtension:ext)
                let parsed:[ImportDraft]
                if ext=="csv" {parsed=NativeImportParser.parseCSV(text)}
                else if current=="ticket" {parsed=NativeImportParser.parseTicket(text)}
                else {parsed=NativeImportParser.parseStatementText(text)}
                await MainActor.run {
                    drafts=parsed;busy=false
                    message=parsed.isEmpty ? "No se identificaron movimientos. Revisa el archivo o introduce los datos manualmente.":
                        "Se han detectado \(parsed.count) posibles movimientos. Marca solo los correctos."
                    isError=parsed.isEmpty
                }
            }catch {
                await MainActor.run {busy=false;message=error.localizedDescription;isError=true}
            }
        }
    }
    private func save() {
        guard let original=rawData else {message="Selecciona de nuevo el original.";return}
        let selected=drafts.filter{$0.selected}
        guard !selected.isEmpty else{message="Selecciona primero los movimientos que quieras guardar.";return}
        var movements=[Movement]()
        for item in selected {
            guard let amount=FinanceFormat.cents(item.amount),NativeImportParser.isoDate(item.date) != nil,
                !item.title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else {
                    message="Corrige los importes, fechas o conceptos antes de guardar.";isError=true;return
            }
            if store.data.transactions.contains(where:{$0.date==item.date && $0.type==item.type && $0.amount==amount && $0.title.localizedCaseInsensitiveCompare(item.title) == .orderedSame}) {
                message="Posible duplicado: \(item.title). Revisa el historial.";isError=true;return
            }
            movements.append(Movement(type:item.type,amount:amount,date:item.date,title:item.title,category:item.category,
                method:"card",note:"Importado de documento",receiptItems:item.items.isEmpty ? nil:item.items,
                importSource:mode=="ticket" ? "ticket":"bank"))
        }
        do {
            let mime=type=="pdf" ? "application/pdf":type=="csv" ? "text/csv":type=="txt" ? "text/plain":"image/"+type
            try store.importMovements(movements,withOriginal:original,name:name,type:mime)
            drafts=[];rawData=nil
            message="Guardados \(movements.count) movimientos y su documento original.";isError=false
        }catch {
            message="No se ha guardado nada: "+error.localizedDescription
            isError=true
        }
    }
}

struct CameraCapture:UIViewControllerRepresentable {
    var onCapture:(Data)->Void
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context:Context)->UIImagePickerController {
        let picker=UIImagePickerController()
        picker.sourceType = .camera
        picker.cameraCaptureMode = .photo
        picker.allowsEditing = false
        picker.delegate=context.coordinator
        return picker
    }
    func updateUIViewController(_ uiViewController:UIImagePickerController,context:Context){}
    func makeCoordinator()->Coordinator {Coordinator(self)}
    final class Coordinator:NSObject,UIImagePickerControllerDelegate,UINavigationControllerDelegate {
        let parent:CameraCapture
        init(_ parent:CameraCapture){self.parent=parent}
        func imagePickerControllerDidCancel(_ picker:UIImagePickerController) {
            parent.dismiss()
        }
        func imagePickerController(_ picker:UIImagePickerController,didFinishPickingMediaWithInfo info:[UIImagePickerController.InfoKey:Any]) {
            if let image=info[.originalImage] as? UIImage,
               let bytes=image.jpegData(compressionQuality:0.83) {
                parent.dismiss()
                parent.onCapture(bytes)
            }else {
                parent.dismiss()
            }
        }
    }
}
