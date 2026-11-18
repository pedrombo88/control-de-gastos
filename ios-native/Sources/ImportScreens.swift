import SwiftUI
import UniformTypeIdentifiers
import PDFKit
import Vision
import UIKit
import PhotosUI

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
        let typeI=idx(["tipo","type","sentido"]),categoryI=idx(["categoria","category"])
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
            // El CSV exportado por Budviva usa importes positivos tanto para
            // gastos como ingresos. La columna «Tipo» prevalece sobre el signo.
            let declared=field(typeI).folding(options:[.diacriticInsensitive,.caseInsensitive],
                                               locale:Locale(identifier:"es_ES")).lowercased()
                .trimmingCharacters(in:.whitespacesAndNewlines)
            let type:String
            switch declared {
            case "gasto","expense","cargo","debito","debit","pago","salida":type="expense"
            case "ingreso","income","abono","credito","credit","entrada":type="income"
            case "":type=value<0 ? "expense":"income"
            default:return nil // No interpretar una categoría desconocida como ingreso.
            }
            let categories=type=="expense" ? FinanceCategory.expense:FinanceCategory.income
            let statedCategory=field(categoryI).folding(options:[.diacriticInsensitive,.caseInsensitive],
                                                        locale:Locale(identifier:"es_ES")).lowercased()
                .trimmingCharacters(in:.whitespacesAndNewlines)
            let category=categories.first(where:{option in
                option.0==statedCategory ||
                option.1.folding(options:[.diacriticInsensitive,.caseInsensitive],
                                 locale:Locale(identifier:"es_ES")).lowercased()==statedCategory
            })?.0 ?? (type=="expense" ? "otros":"otros-ingresos")
            return ImportDraft(date:date,title:String(field(n).prefix(90)),amount:String(format:"%.2f",Double(abs(value))/100).replacingOccurrences(of:".",with:","),type:type,category:category)
        }
    }
    static func parseTicket(_ text:String)->[ImportDraft] {
        let result=NativeReceiptParser.extract(text)
        let amount=result.total ?? result.items.reduce(0){ $0 + $1.amount }
        guard amount>0 else {return []}
        return [
            ImportDraft(
                date:result.date ?? FinanceFormat.date(),
                title:result.merchant,
                amount:String(format:"%.2f",Double(amount)/100).replacingOccurrences(of:".",with:","),
                type:"expense",category:"otros",items:result.items
            )
        ]
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
    static func vision(_ image:CGImage)throws->String {
        let req=VNRecognizeTextRequest()
        req.recognitionLevel = .accurate
        req.recognitionLanguages = ["es-ES","en-US"]
        req.usesLanguageCorrection = true
        try VNImageRequestHandler(cgImage:image).perform([req])

        // Vision puede entregar por separado "QUESO" y "4,20 C".
        // Ordenamos geométricamente antes de analizarlos como renglones.
        let observations=(req.results ?? []).compactMap { observation -> (String,CGRect)? in
            guard let candidate=observation.topCandidates(1).first else{return nil}
            let text=candidate.string.trimmingCharacters(in:.whitespacesAndNewlines)
            return text.isEmpty ? nil : (text,observation.boundingBox)
        }.sorted { a,b in
            let delta=a.1.midY-b.1.midY
            return abs(delta)>0.005 ? delta>0 : a.1.minX<b.1.minX
        }
        struct TextRow {
            var center:CGFloat
            var height:CGFloat
            var chunks:[(String,CGRect)]
        }
        var rows:[TextRow]=[]
        for (text,box) in observations {
            if let last=rows.indices.last,
               abs(rows[last].center-box.midY) < max(0.005,min(rows[last].height,box.height)*0.54) {
                rows[last].chunks.append((text,box))
            } else {
                rows.append(TextRow(center:box.midY,height:box.height,chunks:[(text,box)]))
            }
        }
        return rows.map { row in
            row.chunks.sorted {$0.1.minX<$1.1.minX}.map(\.0).joined(separator:" ")
        }.joined(separator:"\n")
    }
}

struct ImportScreen: View {
    @EnvironmentObject var store:FinanceStore
    @State private var showingPicker=false
    @State private var showingCamera=false
    @State private var gallerySelection:PhotosPickerItem?
    @State private var galleryLoading=false
    @State private var cameraUnavailable=false
    @State private var mode="ticket"
    @State private var drafts=[ImportDraft]()
    @State private var recognizedText=""
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
                    .disabled(busy || galleryLoading)
                Button { showingPicker=true } label: { Label("Seleccionar documento",systemImage:"doc.text.viewfinder").frame(maxWidth:.infinity) }
                    .buttonStyle(.borderedProminent)
                    .disabled(busy || galleryLoading)
                if mode=="ticket" {
                    PhotosPicker(selection:$gallerySelection,matching:.images) {
                        Label("Elegir foto de la galería",systemImage:"photo.on.rectangle.angled")
                            .frame(maxWidth:.infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(busy || galleryLoading)
                    .accessibilityIdentifier("budviva-gallery-picker")
                    Button {
                        if UIImagePickerController.isSourceTypeAvailable(.camera) {showingCamera=true}
                        else {cameraUnavailable=true}
                    } label: {
                        Label("Hacer foto del ticket",systemImage:"camera")
                            .frame(maxWidth:.infinity)
                    }
                    .buttonStyle(.bordered)
                    .disabled(busy || galleryLoading)
                }
                if galleryLoading {ProgressView("Cargando foto de la galería…")}
                if busy {ProgressView("Analizando documento…")}
                Text(message).font(.caption).foregroundStyle(isError ? .red:.secondary)
                if !recognizedText.isEmpty {
                    DisclosureGroup("Ver texto reconocido (OCR)") {
                        Text(recognizedText)
                            .font(.system(.caption,design:.monospaced))
                            .textSelection(.enabled)
                    }
                }
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
                                if mode=="ticket" {
                                    let sum=draft.items.reduce(0){$0+$1.amount}
                                    if let total=FinanceFormat.cents(draft.amount),sum != total {
                                        Text("Revisión necesaria: los productos suman \(FinanceFormat.money(sum)), pero el ticket indica \(FinanceFormat.money(total)). Corrige lo que falte antes de guardar.")
                                            .font(.caption)
                                            .foregroundStyle(.orange)
                                    }
                                }
                                if mode=="ticket" {
                                    DisclosureGroup("Productos (\(draft.items.count))"){
                                        ForEach($draft.items) { $item in
                                            ReceiptProductEditor(product:$item)
                                        }
                                        Button {
                                            draft.items.append(ReceiptProduct(name:"",amount:0))
                                        } label: {
                                            Label("Añadir producto que falte",systemImage:"plus.circle")
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
        .onChange(of:gallerySelection) { _, selected in
            guard let selected else {return}
            Task {await loadGalleryPhoto(selected)}
        }
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
    @MainActor
    private func loadGalleryPhoto(_ selected:PhotosPickerItem) async {
        guard !busy && !galleryLoading else {
            gallerySelection=nil
            return
        }
        galleryLoading=true
        isError=false
        message="Cargando foto de la galería…"
        defer {
            galleryLoading=false
            gallerySelection=nil
        }
        do {
            guard let bytes=try await selected.loadTransferable(type:Data.self),
                  !bytes.isEmpty, let image=UIImage(data:bytes) else {
                throw NSError(domain:"Budviva.Galeria",code:1,userInfo:[
                    NSLocalizedDescriptionKey:"No se ha podido leer la fotografía. Prueba a descargarla en Fotos antes de seleccionarla."
                ])
            }
            let maxBytes=15*1024*1024
            var data=bytes
            // Preferimos el original para conservar la imagen y sus detalles.
            // Las fotografías excepcionales mayores de 15 MB se adaptan a JPEG.
            var ext=selected.supportedContentTypes
                .compactMap { $0.preferredFilenameExtension?.lowercased() }
                .first(where:{["jpg","jpeg","png","heic","heif","tif","tiff","webp"].contains($0)}) ?? "jpg"
            if data.count>maxBytes {
                guard let compressed=image.jpegData(compressionQuality:0.83),
                      compressed.count<=maxBytes else {
                    throw NSError(domain:"Budviva.Galeria",code:2,userInfo:[
                        NSLocalizedDescriptionKey:"La fotografía supera los 15 MB. Elige una imagen más pequeña o guárdala como JPEG."
                    ])
                }
                data=compressed
                ext="jpg"
            }
            analyze(data,name:"ticket-galeria-"+FinanceFormat.date()+"."+ext,ext:ext)
        } catch {
            message="No se ha podido cargar la foto: "+error.localizedDescription
            isError=true
        }
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
        busy=true;isError=false;drafts=[];recognizedText="";message="Analizando "+filename+"…"
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
                    drafts=parsed;recognizedText=(current=="ticket" ? text : "");busy=false
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
        var selectedFingerprints=Set<String>()
        for item in selected {
            guard item.items.allSatisfy({ !$0.name.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty && $0.amount > 0 }) else {
                message="Corrige los nombres e importes de todos los productos antes de guardar.";isError=true;return
            }
            guard let amount=FinanceFormat.cents(item.amount),NativeImportParser.isoDate(item.date) != nil,
                !item.title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else {
                    message="Corrige los importes, fechas o conceptos antes de guardar.";isError=true;return
            }
            if store.data.transactions.contains(where:{$0.date==item.date && $0.type==item.type && $0.amount==amount && $0.title.localizedCaseInsensitiveCompare(item.title) == .orderedSame}) {
                message="Posible duplicado: \(item.title). Revisa el historial.";isError=true;return
            }
            let key="\(item.date)|\(item.type)|\(amount)|\(item.title.trimmingCharacters(in:.whitespacesAndNewlines).folding(options:[.diacriticInsensitive,.caseInsensitive],locale:Locale(identifier:"es_ES")).lowercased())"
            guard selectedFingerprints.insert(key).inserted else {
                message="El archivo contiene movimientos repetidos: \(item.title). Desmarca uno para continuar."
                isError=true;return
            }
            movements.append(Movement(type:item.type,amount:amount,date:item.date,title:item.title,category:item.category,
                method:"card",note:"Importado de documento",receiptItems:item.items.isEmpty ? nil:item.items,
                importSource:mode=="ticket" ? "ticket":"bank"))
        }
        do {
            let mime=type=="pdf" ? "application/pdf":type=="csv" ? "text/csv":type=="txt" ? "text/plain":"image/"+type
            try store.importMovements(movements,withOriginal:original,name:name,type:mime)
            drafts=[];rawData=nil;recognizedText=""
            message="Guardados \(movements.count) movimientos y su documento original.";isError=false
        }catch {
            message="No se ha guardado nada: "+error.localizedDescription
            isError=true
        }
    }
}


private struct ReceiptProductEditor: View {
    @Binding var product: ReceiptProduct
    @State private var amountText=""

    var body: some View {
        VStack(alignment:.leading,spacing:7) {
            TextField("Nombre del producto",text:$product.name)
                .textInputAutocapitalization(.words)
            HStack {
                TextField("Importe (€)",text:$amountText)
                    .keyboardType(.decimalPad)
                    .onChange(of:amountText) { _, next in
                        product.amount=NativeImportParser.cents(next) ?? 0
                    }
                if let count=product.quantity,count>1 {
                    Text("\(count) uds.").font(.caption).foregroundStyle(.secondary)
                }
                Picker("Necesidad",selection:$product.necessity){
                    Text("Pendiente").tag("pending")
                    Text("Necesario").tag("necessary")
                    Text("No necesario").tag("optional")
                }
                .labelsHidden()
            }
        }
        .padding(.vertical,5)
        .onAppear {
            amountText=String(format:"%.2f",Double(product.amount)/100)
                .replacingOccurrences(of:".",with:",")
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
