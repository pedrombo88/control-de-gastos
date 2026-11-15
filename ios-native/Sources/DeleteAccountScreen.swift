import Foundation
import SwiftUI

/// Baja definitiva de la cuenta de acceso de Budviva, no del almacenamiento local.
/// Reutiliza la Edge Function de seguridad y el OTP real de Supabase.
@MainActor
final class BudvivaAccountDeletion: ObservableObject {
    @Published var working=false
    @Published var checked=false
    @Published var codeSent=false
    @Published var feedback: String?
    @Published var error: String?

    private enum RequestError: LocalizedError {
        case message(String)
        var errorDescription: String? {
            if case .message(let detail)=self {return detail}
            return nil
        }
    }

    private func send(_ path: String, body: [String: Any], session: BudvivaSession) async throws -> [String: Any] {
        guard let url=URL(string:"https://bsvtttcuqamjifnpuzlj.supabase.co/"+path) else {
            throw RequestError.message("No se ha podido abrir el servicio de cuentas.")
        }
        var request=URLRequest(url:url)
        request.httpMethod="POST"
        request.timeoutInterval=25
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json",forHTTPHeaderField:"Content-Type")
        request.setValue(BudvivaAuthAPI.publicKey,forHTTPHeaderField:"apikey")
        if path.contains("functions/") {
            request.setValue("Bearer "+session.accessToken,forHTTPHeaderField:"Authorization")
        }
        request.httpBody=try JSONSerialization.data(withJSONObject:body)
        let (data,response)=try await URLSession.shared.data(for:request)
        guard let http=response as? HTTPURLResponse else {
            throw RequestError.message("No se ha podido conectar con el servicio de cuentas.")
        }
        let result=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any] ?? [:]
        guard (200...299).contains(http.statusCode) else {
            let message=(result["message"] as? String) ??
                (result["msg"] as? String) ??
                (result["error_description"] as? String) ??
                "La operación no ha podido completarse (\(http.statusCode))."
            throw RequestError.message(message)
        }
        return result
    }

    func check(session: BudvivaSession) async {
        guard !working else { return }
        working=true;error=nil;feedback=nil
        defer {working=false}
        do {
            let result=try await send("functions/v1/bv-delete-account",body:["action":"check"],session:session)
            checked=true
            feedback=(result["message"] as? String) ?? "Cuenta comprobada: puedes solicitar el código."
        } catch {
            checked=false
            self.error=error.localizedDescription
        }
    }

    func requestCode(session: BudvivaSession) async {
        guard !working,checked else {return}
        working=true;error=nil;feedback=nil
        defer {working=false}
        do {
            _=try await send("auth/v1/otp",body:[
                "email":session.email,
                "create_user":false
            ],session:session)
            codeSent=true
            feedback="Código enviado a tu correo. Introduce las 8 cifras para confirmar."
        } catch {
            self.error=error.localizedDescription
        }
    }

    /// Solo la Edge Function, tras reautenticación y comprobar referencias compartidas,
    /// puede ejecutar una eliminación real. No usar nunca la clave de administración.
    func deleteAccount(session: BudvivaSession, code: String) async -> Bool {
        guard !working,checked,codeSent else {return false}
        guard BudvivaAuth.isValidOTP(code) else {
            error="Introduce el código de 8 cifras recibido por correo."
            return false
        }
        working=true;error=nil;feedback=nil
        defer {working=false}
        do {
            _=try await send("functions/v1/bv-delete-account",body:[
                "method":"email_otp",
                "otp":code,
                "confirm":"ELIMINAR CUENTA"
            ],session:session)
            feedback="Cuenta eliminada. Los archivos financieros locales no se han borrado."
            return true
        } catch {
            self.error=error.localizedDescription
            return false
        }
    }
}

struct BudvivaDeleteAccountScreen: View {
    @EnvironmentObject private var auth: BudvivaAuth
    @Environment(\.dismiss) private var dismiss
    @StateObject private var flow=BudvivaAccountDeletion()
    @State private var code=""
    @State private var confirmation=""
    @State private var showIrreversibleConfirmation=false

    var body: some View {
        Form {
            Section("Eliminar mi cuenta de acceso") {
                Text("Esta operación elimina permanentemente la cuenta de Budviva y su acceso a Compartidos. No borra automáticamente los movimientos, documentos ni copias almacenados en este iPhone.")
                    .font(.subheadline)
                Text("Antes de continuar, guarda una copia desde Ajustes. Si perteneces a un grupo de Compartidos, tendrás que cerrarlo o abandonarlo antes de eliminar la cuenta.")
                    .font(.footnote).foregroundStyle(.secondary)
                if let email=auth.session?.email {
                    LabeledContent("Cuenta",value:email)
                }
            }
            Section("Paso 1 · Comprobar cuenta") {
                Button("Comprobar si puedo eliminar la cuenta") {
                    guard let session=auth.session else {return}
                    Task {await flow.check(session:session)}
                }
                .disabled(flow.working)
                .accessibilityIdentifier("budviva-delete-account-check")
            }
            if flow.checked {
                Section("Paso 2 · Confirmar por correo") {
                    Button("Enviar código de eliminación") {
                        guard let session=auth.session else {return}
                        Task {await flow.requestCode(session:session)}
                    }
                    .disabled(flow.working)
                    if flow.codeSent {
                        TextField("Código de 8 cifras",text:$code)
                            .keyboardType(.numberPad)
                            .textContentType(.oneTimeCode)
                            .onChange(of:code) {_,next in
                                let digits=String(next.filter {$0 >= "0" && $0 <= "9"}.prefix(8))
                                if code != digits {code=digits}
                            }
                            .accessibilityIdentifier("budviva-account-deletion-code")
                        TextField("Escribe ELIMINAR CUENTA",text:$confirmation)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                        Button("Eliminar definitivamente",role:.destructive) {
                            showIrreversibleConfirmation=true
                        }
                        .disabled(flow.working || !BudvivaAuth.isValidOTP(code) || confirmation != "ELIMINAR CUENTA")
                    }
                }
            }
            if let feedback=flow.feedback {
                Section {
                    Text(feedback).foregroundStyle(.secondary).font(.footnote)
                }
            }
            if let error=flow.error {
                Section {
                    Text(error).foregroundStyle(.red).font(.footnote)
                }
            }
        }
        .navigationTitle("Eliminar mi cuenta")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement:.cancellationAction) {Button("Cerrar") {dismiss()} } }
        .confirmationDialog("¿Eliminar tu cuenta definitivamente?",isPresented:$showIrreversibleConfirmation,titleVisibility:.visible) {
            Button("Sí, eliminar mi cuenta",role:.destructive) {
                guard let session=auth.session else {return}
                Task {
                    if await flow.deleteAccount(session:session,code:code) {
                        auth.signOut()
                        dismiss()
                    }
                }
            }
            Button("Cancelar",role:.cancel) {}
        } message: {
            Text("Esta acción es irreversible. Los datos locales del iPhone se conservan y deberán gestionarse por separado.")
        }
    }
}
