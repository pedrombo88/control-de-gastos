import SwiftUI
import Foundation
import Security

/// Autenticación real de Budviva mediante los códigos OTP del proyecto Supabase de Compartidos.
/// Solo guarda los tokens en el llavero del iPhone; no utiliza contraseñas ni claves privadas.
private enum BudvivaAuthAPI {
    static let base = URL(string:"https://bsvtttcuqamjifnpuzlj.supabase.co/auth/v1")!
    static let publicKey = "sb_publishable_vuz1EmFnMWS9PgMQVXEBjw_3F-6G1gr"
}

struct BudvivaSession: Codable {
    var userID: String
    var email: String
    var accessToken: String
    var refreshToken: String
    var expiresAt: Date
}

private enum BudvivaSessionKeychain {
    private static let service = "com.budviva.auth.session"
    private static let account = "active"

    static func load() -> BudvivaSession? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return try? JSONDecoder().decode(BudvivaSession.self, from: data)
    }

    static func save(_ value: BudvivaSession) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        remove()
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        SecItemAdd(query as CFDictionary, nil)
    }

    static func remove() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}

@MainActor
final class BudvivaAuth: ObservableObject {
    @Published private(set) var session: BudvivaSession?
    @Published private(set) var checking = true
    @Published private(set) var busy = false
    @Published var error: String?
    @Published private(set) var pendingEmail: String?
    @Published private(set) var registrationMode = false

    init() {
        #if DEBUG && targetEnvironment(simulator)
        if ProcessInfo.processInfo.arguments.contains("--budviva-ui-test-session") {
            session = BudvivaSession(userID:"ui-test",email:"pruebas@example.invalid",
                accessToken:"test",refreshToken:"test",expiresAt:Date.distantFuture)
            checking = false
            return
        }
        #endif
        Task { await restore() }
    }

    private func perform(_ path: String, body: [String: Any], bearer: String? = nil) async throws -> [String: Any] {
        // URLComponents evita codificar '?' como parte de la ruta del endpoint de refresh.
        let chunks=path.split(separator:"?",maxSplits:1).map(String.init)
        let endpoint=BudvivaAuthAPI.base.appendingPathComponent(chunks[0])
        var components=URLComponents(url:endpoint,resolvingAgainstBaseURL:false)!
        if chunks.count>1 { components.percentEncodedQuery=chunks[1] }
        guard let url=components.url else { throw AuthFailure.message("Error en la URL de acceso.") }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json",forHTTPHeaderField:"Content-Type")
        request.setValue(BudvivaAuthAPI.publicKey,forHTTPHeaderField:"apikey")
        if let bearer { request.setValue("Bearer " + bearer,forHTTPHeaderField:"Authorization") }
        request.httpBody = try JSONSerialization.data(withJSONObject:body)
        let (data,response) = try await URLSession.shared.data(for:request)
        guard let http=response as? HTTPURLResponse else { throw AuthFailure.message("No se puede contactar con el servidor de acceso.") }
        let json = (try? JSONSerialization.jsonObject(with:data)) as? [String:Any] ?? [:]
        guard (200...299).contains(http.statusCode) else {
            let detail = (json["msg"] as? String) ?? (json["message"] as? String) ??
                (json["error_description"] as? String) ?? (json["error"] as? String) ?? "No se pudo completar el acceso."
            throw AuthFailure.message(detail)
        }
        return json
    }

    private enum AuthFailure: LocalizedError {
        case message(String)
        var errorDescription: String? { if case .message(let text) = self { return text }; return nil }
    }

    private func session(from json:[String:Any], fallbackEmail:String) throws -> BudvivaSession {
        guard let access=json["access_token"] as? String,
              let refresh=json["refresh_token"] as? String,
              let user=json["user"] as? [String:Any],
              let uid=user["id"] as? String else {
            throw AuthFailure.message("El servidor no ha devuelto una sesión válida.")
        }
        let expires=(json["expires_in"] as? NSNumber)?.doubleValue ?? 3600
        return BudvivaSession(userID:uid,email:user["email"] as? String ?? fallbackEmail,
                              accessToken:access,refreshToken:refresh,
                              expiresAt:Date().addingTimeInterval(max(60,expires)))
    }

    private func restore() async {
        defer { checking=false }
        guard let stored=BudvivaSessionKeychain.load() else { return }
        do {
            let json=try await perform("token?grant_type=refresh_token",
                                      body:["refresh_token":stored.refreshToken])
            let updated=try session(from:json,fallbackEmail:stored.email)
            BudvivaSessionKeychain.save(updated)
            session=updated
        } catch {
            // Permite consultar los datos locales si hay una sesión aún vigente sin conexión.
            if stored.expiresAt > Date().addingTimeInterval(30) { session=stored }
            else { BudvivaSessionKeychain.remove() }
        }
    }

    func sendCode(email:String,createUser:Bool) async -> Bool {
        let normalized=email.trimmingCharacters(in:.whitespacesAndNewlines).lowercased()
        guard normalized.contains("@"),normalized.split(separator:"@").count==2,normalized.contains(".") else {
            error="Introduce una dirección de correo válida."
            return false
        }
        busy=true;error=nil
        defer { busy=false }
        do {
            _=try await perform("otp",body:["email":normalized,"create_user":createUser])
            pendingEmail=normalized
            registrationMode=createUser
            return true
        } catch {
            self.error=error.localizedDescription
            return false
        }
    }

    func verifyCode(_ code:String) async -> Bool {
        guard let email=pendingEmail else { return false }
        let normalized=code.trimmingCharacters(in:.whitespacesAndNewlines)
        guard normalized.count==6,normalized.allSatisfy({$0.isNumber}) else {
            error="Introduce el código de 6 cifras recibido por correo."
            return false
        }
        busy=true;error=nil
        defer { busy=false }
        do {
            let json=try await perform("verify",body:["email":email,"token":normalized,"type":"email"])
            let active=try session(from:json,fallbackEmail:email)
            BudvivaSessionKeychain.save(active)
            session=active
            pendingEmail=nil
            return true
        } catch {
            self.error=error.localizedDescription
            return false
        }
    }

    func cancelCode() { pendingEmail=nil;error=nil }

    func signOut() {
        let previous=session
        BudvivaSessionKeychain.remove()
        session=nil
        pendingEmail=nil
        error=nil
        if let previous {
            Task { _=try? await perform("logout",body:[:],bearer:previous.accessToken) }
        }
    }
}

struct BudvivaLoginScreen: View {
    @EnvironmentObject private var auth: BudvivaAuth
    @State private var email = ""
    @State private var code = ""
    @State private var createUser = false

    var body: some View {
        ScrollView {
            VStack(spacing:20) {
                Spacer(minLength:35)
                Image("BudvivaMark")
                    .resizable().scaledToFit()
                    .frame(width:100,height:100)
                    .clipShape(RoundedRectangle(cornerRadius:23))
                    .accessibilityLabel("Logotipo Budviva")
                Text("Budviva")
                    .font(.system(size:36,weight:.bold,design:.rounded))
                    .foregroundStyle(Color(red:0.06,green:0.17,blue:0.35))
                Text("Tu dinero, más claro")
                    .font(.subheadline).foregroundStyle(.secondary)
                VStack(alignment:.leading,spacing:18) {
                    if auth.pendingEmail == nil {
                        Picker("Acceso",selection:$createUser) {
                            Text("Iniciar sesión").tag(false)
                            Text("Crear cuenta").tag(true)
                        }
                        .pickerStyle(.segmented)
                        Text(createUser ? "Crea tu cuenta" : "Bienvenido de nuevo")
                            .font(.title3.bold())
                        TextField("Correo electrónico",text:$email)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .padding(14)
                            .background(Color(.secondarySystemBackground),in:RoundedRectangle(cornerRadius:13))
                            .accessibilityIdentifier("budviva-login-email")
                        Button {
                            Task { _=await auth.sendCode(email:email,createUser:createUser) }
                        } label: {
                            Text("Enviar código de acceso").frame(maxWidth:.infinity,minHeight:48)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(auth.busy)
                        .accessibilityIdentifier("budviva-send-otp")
                    } else {
                        Text("Comprueba tu correo")
                            .font(.title3.bold())
                        Text("Hemos enviado un código a \(auth.pendingEmail ?? "")")
                            .font(.subheadline).foregroundStyle(.secondary)
                        TextField("Código de 6 cifras",text:$code)
                            .keyboardType(.numberPad)
                            .textContentType(.oneTimeCode)
                            .padding(14)
                            .background(Color(.secondarySystemBackground),in:RoundedRectangle(cornerRadius:13))
                            .accessibilityIdentifier("budviva-login-code")
                        Button {
                            Task { _=await auth.verifyCode(code) }
                        } label: {
                            Text("Verificar y entrar").frame(maxWidth:.infinity,minHeight:48)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(auth.busy)
                        Button("Cambiar correo") { auth.cancelCode();code="" }
                            .font(.subheadline)
                    }
                    if auth.busy { ProgressView().frame(maxWidth:.infinity) }
                    if let error=auth.error {
                        Text(error).font(.footnote).foregroundStyle(.red)
                            .accessibilityIdentifier("budviva-login-error")
                    }
                }
                .padding(23)
                .background(.white,in:RoundedRectangle(cornerRadius:24))
                .shadow(color:.black.opacity(0.07),radius:18,y:8)
                Text("Tus movimientos personales permanecen guardados en este iPhone. La cuenta permite acceder a Compartidos; por ahora no sincroniza el historial personal entre dispositivos.")
                    .font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                Spacer(minLength:25)
            }
            .frame(maxWidth:440)
            .padding(23)
            .frame(maxWidth:.infinity)
        }
        .background(Color(red:0.95,green:0.97,blue:0.99).ignoresSafeArea())
    }
}
