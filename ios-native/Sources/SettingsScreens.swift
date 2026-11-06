import SwiftUI
import UniformTypeIdentifiers

struct SettingsScreen: View {
    @EnvironmentObject var store: FinanceStore
    @State private var importing = false
    @State private var exporting = false
    @State private var exportFile: BackupFile?
    @State private var encryptedExport = false
    @State private var rescueExport = false
    @State private var password = ""
    @State private var repeatPassword = ""
    @State private var promptExportPassword = false
    @State private var promptUnlock = false
    @State private var unlockPassword = ""
    @State private var encryptedData: Data?
    @State private var pendingRestore: Data?
    @State private var confirmRestore = false
    @State private var confirmErase = false
    @State private var notification: String?

    var body: some View {
        Form {
            if store.isCorrupt {
                Section {
                    Button {
                        prepareEmergencyExport()
                    } label: {
                        Label("Descargar archivo de rescate",systemImage:"lifepreserver")
                    }
                } header: {
                    Text("Recuperación de datos")
                } footer: {
                    Text("Budviva no puede interpretar los datos guardados. Esta acción copia los bytes originales, sin modificarlos ni borrarlos. El archivo contiene información financiera privada: consérvalo en un lugar seguro.")
                }
            }
            Section {
                Button {
                    prepareExport(encrypted: false)
                } label: { Label("Descargar copia completa", systemImage:"square.and.arrow.up") }
                Button {
                    password=""; repeatPassword="";promptExportPassword=true
                } label: {Label("Copia cifrada con contraseña",systemImage:"lock.shield")}
                Button { importing=true } label: {
                    Label("Restaurar copia JSON o cifrada",systemImage:"square.and.arrow.down")
                }
            } header: {Text("Copias de seguridad")}
            footer: {
                Text("Las copias completas incluyen los movimientos, objetivos y archivos originales. Las copias sin cifrar contienen datos financieros privados. Guarda las copias en una ubicación segura.")
            }

            Section("Apariencia") {
                Picker("Tema",selection:Binding(get:{store.theme},set:{store.setTheme($0)})) {
                    Text("Océano").tag("oceano")
                    Text("Esmeralda").tag("esmeralda")
                    Text("Arena").tag("arena")
                    Text("Noche").tag("noche")
                }
            }

            Section("Privacidad y soporte") {
                Link(destination: URL(string:"https://pedrombo88.github.io/control-de-gastos/privacidad.html")!) {
                    Label("Política de privacidad",systemImage:"hand.raised")
                }
                Link(destination: URL(string:"https://pedrombo88.github.io/control-de-gastos/soporte.html")!) {
                    Label("Ayuda y soporte",systemImage:"questionmark.circle")
                }
                Text("Tus datos financieros se guardan en este iPhone. Las imágenes y los extractos se procesan de forma local. No se solicitan claves bancarias.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Section {
                Button(role:.destructive) {confirmErase=true} label: {
                    Label("Eliminar datos y documentos",systemImage:"trash")
                }
            } header: { Text("Eliminar datos") }
            footer: {Text("Este borrado no elimina las copias descargadas fuera de Budviva.")}
            Section {
                HStack {
                    Text("Versión")
                    Spacer()
                    Text("1.1 · beta iOS").foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Ajustes")
        .fileImporter(isPresented:$importing,allowedContentTypes:[.json,.data],allowsMultipleSelection:false) {result in
            switch result {
            case .success(let files):if let file=files.first {readBackup(file)}
            case .failure(let err):notification=err.localizedDescription
            }
        }
        .fileExporter(isPresented:$exporting,document:exportFile,
                      contentType:rescueExport ? .plainText : (encryptedExport ? .data:.json),
                      defaultFilename:rescueExport ? "budviva-rescate-original.txt" :
                        (encryptedExport ? "budviva-cifrada.budviva":"budviva-completa.json")) {result in
            if case .failure(let error) = result {notification=error.localizedDescription}
            exportFile=nil
        }
        .alert("Crear copia cifrada",isPresented:$promptExportPassword) {
            SecureField("Contraseña (mínimo 12 caracteres)",text:$password)
            SecureField("Repetir contraseña",text:$repeatPassword)
            Button("Cancelar",role:.cancel){password="";repeatPassword=""}
            Button("Cifrar y exportar") {
                guard password.count>=12,password==repeatPassword else {
                    notification="Las contraseñas deben coincidir y tener al menos 12 caracteres."
                    return
                }
                prepareExport(encrypted:true)
                password="";repeatPassword=""
            }
        } message: {
            Text("Protege tu copia de seguridad. Si pierdes la contraseña, nadie podrá recuperarla.")
        }
        .alert("Descifrar copia",isPresented:$promptUnlock) {
            SecureField("Contraseña de la copia",text:$unlockPassword)
            Button("Cancelar",role:.cancel){unlockPassword="";encryptedData=nil}
            Button("Abrir") {
                do {
                    guard let encryptedData else {throw LocalFinanceError.invalidBackup}
                    pendingRestore=try BackupCipher.decrypt(encryptedData,password:unlockPassword)
                    unlockPassword="";self.encryptedData=nil
                    confirmRestore=true
                } catch {
                    notification=error.localizedDescription
                }
            }
        } message: {Text("Escribe la contraseña con la que protegiste esta copia.")}
        .confirmationDialog("Restaurar copia de seguridad",isPresented:$confirmRestore) {
            Button("Reemplazar los datos del iPhone",role:.destructive) {
                guard let pendingRestore else{return}
                do {
                    try store.restoreBackup(pendingRestore)
                    notification="Copia restaurada correctamente."
                }catch{
                    notification="No se pudo restaurar: "+error.localizedDescription
                }
                self.pendingRestore=nil
            }
            Button("Cancelar",role:.cancel){pendingRestore=nil}
        } message: {
            Text("Se reemplazarán tus movimientos y objetivos actuales. Exporta primero una copia completa.")
        }
        .confirmationDialog("Eliminar todos los datos",isPresented:$confirmErase) {
            Button("Eliminar definitivamente",role:.destructive) {
                do {try store.wipe();notification="Se han eliminado los datos locales."}
                catch {notification=error.localizedDescription}
            }
            Button("Cancelar",role:.cancel){}
        } message: {Text("Borra movimientos, presupuestos, objetivos y originales. Esta operación no se puede deshacer.")}
        .alert("Budviva",isPresented:Binding(get:{notification != nil},set:{if !$0 {notification=nil}})) {
            Button("Aceptar"){notification=nil}
        } message: {Text(notification ?? "")}
    }
    private func prepareEmergencyExport() {
        do {
            let raw=try store.exportEmergencyData()
            exportFile=BackupFile(data:raw)
            rescueExport=true
            encryptedExport=false
            exporting=true
        } catch {
            notification="No se pudo preparar el archivo de rescate: "+error.localizedDescription
        }
    }
    private func prepareExport(encrypted:Bool) {
        do {
            let raw=try store.exportBackup()
            let result=encrypted ? try BackupCipher.encrypt(raw,password:password):raw
            exportFile=BackupFile(data:result)
            rescueExport=false
            encryptedExport=encrypted
            exporting=true
        }catch{
            notification="No se pudo exportar: "+error.localizedDescription
        }
    }
    private func readBackup(_ url:URL) {
        let granted=url.startAccessingSecurityScopedResource()
        defer {if granted {url.stopAccessingSecurityScopedResource()}}
        do {
            let attributes=try FileManager.default.attributesOfItem(atPath:url.path)
            if (attributes[.size] as? NSNumber)?.intValue ?? 0 > 110*1024*1024 {
                notification="La copia supera el límite de 110 MB.";return
            }
            let bytes=try Data(contentsOf:url)
            if BackupCipher.isEncrypted(bytes) {
                encryptedData=bytes
                unlockPassword=""
                promptUnlock=true
            }else {
                // Se valida el formato al confirmar la restauración.
                pendingRestore=bytes
                confirmRestore=true
            }
        }catch{
            notification="No se pudo leer la copia: "+error.localizedDescription
        }
    }
}
