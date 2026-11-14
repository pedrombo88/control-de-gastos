import SwiftUI
import Security

/// Autenticación real con Supabase Auth. La clave publicable no es un secreto.
/// Las credenciales no se guardan nunca; la sesión se protege en el llavero del iPhone.
@MainActor
final class BudvivaAuth: ObservableObject {
    @Published private(set) var userID: String?
    @Published private(set) var email = ""
    @Published private(set) var isChecking = true
    @Published private(set) var isWorking = false
    @Published var errorMessage: String?
    @Published var notice: String?

    private static let endpoint = "https://bsvtttcuqamjifnpuzlj.supabase.co"
    private static let publicKey = "sb_publishable_vuz1EmFnMWS9PgMQVXEBjw_3F-6G1gr"
    private static let keychainService = "com.example.budviva.auth.v1"
    private static let keychainAccount = "supabase-session"
    private var session: Session?

    struct Session: Codable {
        var accessToken: String
        var refreshToken: String
        var expiresAt: Date
        var id: String
        var email: String
    }
    private struct User: Decodable {
        let id: String
        let email: String?
    }
    private struct TokenResponse: Decodable {
        let access_token: String?
        let refresh_token: String?
        let expires_in: Int?
        let user: User?
    }
    private struct ErrorResponse: Decodable {
        let msg: String?
        let message: String?
        let error_description: String?
        let error: String?
    }
    private enum AuthFailure: LocalizedError {
        case invalidResponse
        case requestFailed(Int, String)
        var errorDescription: String? {
            switch self {
            case .invalidResponse: return "La respuesta del servidor no es válida."
            case let .requestFailed(_, detail): return detail
            }
        }
    }

    init() {
        #if targetEnvironment(simulator)
        // Solo simulador: navegación de prueba sin usar credenciales reales.
        if ProcessInfo.processInfo.arguments.contains("--budviva-ui-test") {
            userID = "00000000-0000-0000-0000-000000000001"
            email = "simulador@ejemplo.invalid"
            isChecking = false
            return
        }
        #endif
        Task { await restore() }
    }

    private func request(_ path: String, method: String = "GET",
                         body: [String: String]? = nil,
                         token: String? = nil) async throws -> Data {
        guard let url = URL(string: Self.endpoint + path) else { throw AuthFailure.invalidResponse }
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.timeoutInterval = 20
        req.setValue(Self.publicKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        if let token { req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization") }
        if let body { req.httpBody = try JSONSerialization.data(withJSONObject: body) }
        let (bytes, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw AuthFailure.invalidResponse }
        guard (200...299).contains(http.statusCode) else {
            let detail = try? JSONDecoder().decode(ErrorResponse.self, from: bytes)
            let message = detail?.error_description ?? detail?.msg ?? detail?.message ??
                detail?.error ?? "Error de conexión con la cuenta (\(http.statusCode))."
            throw AuthFailure.requestFailed(http.statusCode, message)
        }
        return bytes
    }

    private func tokenSession(_ response: TokenResponse) throws -> Session {
        guard let access = response.access_token, let refresh = response.refresh_token,
              let user = response.user, UUID(uuidString: user.id) != nil else {
            throw AuthFailure.invalidResponse
        }
        return Session(accessToken: access, refreshToken: refresh,
                       expiresAt: Date().addingTimeInterval(TimeInterval(response.expires_in ?? 3600)),
                       id: user.id.lowercased(), email: user.email ?? "")
    }

    private func remember(_ newSession: Session) {
        session = newSession
        userID = newSession.id
        email = newSession.email
        guard let bytes = try? JSONEncoder().encode(newSession) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: Self.keychainAccount
        ]
        SecItemDelete(query as CFDictionary)
        var attributes = query
        attributes[kSecValueData as String] = bytes
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(attributes as CFDictionary, nil)
        if status != errSecSuccess {
            errorMessage = "No se pudo guardar la sesión de forma segura en el iPhone."
        }
    }

    private func savedSession() -> Session? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: Self.keychainAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var value: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &value) == errSecSuccess,
              let bytes = value as? Data else { return nil }
        return try? JSONDecoder().decode(Session.self, from: bytes)
    }

    private func clearSession() {
        session = nil
        userID = nil
        email = ""
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.keychainService,
            kSecAttrAccount as String: Self.keychainAccount
        ]
        SecItemDelete(query as CFDictionary)
    }

    private func refresh(_ previous: Session) async throws -> Session {
        let bytes = try await request("/auth/v1/token?grant_type=refresh_token",
                                      method: "POST",
                                      body: ["refresh_token": previous.refreshToken])
        return try tokenSession(JSONDecoder().decode(TokenResponse.self, from: bytes))
    }

    private func restore() async {
        defer { isChecking = false }
        guard var stored = savedSession() else { return }
        do {
            if stored.expiresAt < Date().addingTimeInterval(90) {
                stored = try await refresh(stored)
            }
            let bytes = try await request("/auth/v1/user", token: stored.accessToken)
            let confirmed = try JSONDecoder().decode(User.self, from: bytes)
            guard confirmed.id.lowercased() == stored.id else {
                clearSession()
                return
            }
            stored.email = confirmed.email ?? stored.email
            remember(stored)
        } catch {
            // Una sesión sin validar nunca permite ver los datos locales.
            // Se conserva el token cifrado si el fallo es de conectividad.
            if let failure = error as? AuthFailure,
               case let .requestFailed(status, _) = failure,
               [400, 401, 403].contains(status) {
                clearSession()
            }
            errorMessage = "No se ha podido verificar la sesión. Inicia sesión para continuar."
        }
    }

    func login(address: String, password: String) async {
        guard !isWorking else { return }
        isWorking = true
        errorMessage = nil
        notice = nil
        defer { isWorking = false }
        do {
            let bytes = try await request("/auth/v1/token?grant_type=password",
                                          method: "POST",
                                          body: ["email": address.trimmingCharacters(in: .whitespacesAndNewlines),
                                                 "password": password])
            remember(try tokenSession(JSONDecoder().decode(TokenResponse.self, from: bytes)))
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func register(address: String, password: String) async {
        guard !isWorking else { return }
        isWorking = true
        errorMessage = nil
        notice = nil
        defer { isWorking = false }
        do {
            let bytes = try await request("/auth/v1/signup", method: "POST",
                                          body: ["email": address.trimmingCharacters(in: .whitespacesAndNewlines),
                                                 "password": password])
            let payload = try JSONDecoder().decode(TokenResponse.self, from: bytes)
            if payload.access_token != nil && payload.refresh_token != nil {
                remember(try tokenSession(payload))
            } else {
                notice = "Comprueba tu correo y confirma tu cuenta. Después, inicia sesión."
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func recover(address: String) async {
        guard !isWorking else { return }
        isWorking = true
        errorMessage = nil
        notice = nil
        defer { isWorking = false }
        do {
            _ = try await request("/auth/v1/recover", method: "POST",
                                  body: ["email": address.trimmingCharacters(in: .whitespacesAndNewlines)])
            notice = "Si la cuenta existe, recibirás un correo para recuperar la contraseña."
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func logout() async {
        let token = session?.accessToken
        clearSession()
        if let token {
            _ = try? await request("/auth/v1/logout", method: "POST", token: token)
        }
    }
}

struct BudvivaLoginScreen: View {
    @EnvironmentObject private var auth: BudvivaAuth
    @State private var register = false
    @State private var address = ""
    @State private var password = ""
    @State private var passwordVisible = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                HStack(spacing: 14) {
                    BudvivaBrandMark()
                        .frame(width: 60, height: 60)
                    VStack(alignment: .leading, spacing: 3) {
                        Text("budviva").font(.system(size: 29, weight: .bold, design: .rounded))
                            .tracking(-1.5)
                        Text("Tu dinero, en perspectiva.")
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                }
                .padding(.top, 45)

                VStack(alignment: .leading, spacing: 6) {
                    Text(register ? "Empieza a tomar el control." : "Bienvenido de nuevo.")
                        .font(.system(size: 31, weight: .bold, design: .rounded))
                        .tracking(-0.8)
                    Text(register ? "Crea una cuenta para empezar." : "Accede a tu espacio financiero.")
                        .foregroundStyle(.secondary)
                }

                Picker("Acceso", selection: $register) {
                    Text("Entrar").tag(false)
                    Text("Crear cuenta").tag(true)
                }
                .pickerStyle(.segmented)

                VStack(alignment: .leading, spacing: 16) {
                    TextField("Correo electrónico", text: $address)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .textFieldStyle(.roundedBorder)
                        .accessibilityIdentifier("auth-email")
                    Group {
                        if passwordVisible {
                            TextField("Contraseña", text: $password)
                        } else {
                            SecureField("Contraseña", text: $password)
                        }
                    }
                    .textContentType(register ? .newPassword : .password)
                    .textFieldStyle(.roundedBorder)
                    .accessibilityIdentifier("auth-password")

                    Toggle("Mostrar contraseña", isOn: $passwordVisible)
                        .font(.caption).tint(BudvivaPalette("oceano").accent)

                    if let error = auth.errorMessage {
                        Label(error, systemImage: "exclamationmark.circle")
                            .font(.footnote).foregroundStyle(.red)
                    }
                    if let notice = auth.notice {
                        Label(notice, systemImage: "envelope.badge")
                            .font(.footnote).foregroundStyle(.secondary)
                    }

                    Button {
                        Task {
                            if register {
                                await auth.register(address: address, password: password)
                            } else {
                                await auth.login(address: address, password: password)
                            }
                            password = ""
                        }
                    } label: {
                        HStack {
                            Spacer()
                            if auth.isWorking { ProgressView().tint(.white) }
                            Text(register ? "Crear cuenta" : "Iniciar sesión")
                                .fontWeight(.semibold)
                            Spacer()
                        }
                        .padding(.vertical, 11)
                    }
                    .disabled(auth.isWorking || !address.contains("@") || password.count < (register ? 8 : 1))
                    .buttonStyle(.borderedProminent)
                    .tint(BudvivaPalette("oceano").accent)
                    .accessibilityIdentifier("auth-submit")

                    Button("¿Has olvidado la contraseña?") {
                        Task { await auth.recover(address: address) }
                    }
                    .font(.footnote)
                    .disabled(auth.isWorking || !address.contains("@"))
                    .frame(maxWidth: .infinity)
                }
                .padding(21)
                .background(.white, in: RoundedRectangle(cornerRadius: 24))

                Text("Utiliza la misma cuenta de Budviva Compartidos. Tus gastos personales se guardan únicamente en este iPhone y no se sincronizan con la web.")
                    .font(.footnote).foregroundStyle(.secondary)
                Link("Privacidad y gestión de la cuenta",
                     destination: SharedExpensesService.privacyURL)
                    .font(.footnote)
                Spacer(minLength: 20)
            }
            .padding(22)
        }
        .background(BudvivaPalette("oceano").canvas.ignoresSafeArea())
    }
}

/// Marca vectorial: una B geométrica clara con dos contraformas reales.
struct BudvivaBrandMark: View {
    var body: some View {
        GeometryReader { geometry in
            let s = min(geometry.size.width, geometry.size.height)
            ZStack {
                RoundedRectangle(cornerRadius: s * 0.25, style: .continuous)
                    .fill(Color(red: 0.07, green: 0.14, blue: 0.19))
                Path { p in
                    p.move(to: CGPoint(x: s * 0.24, y: s * 0.17))
                    p.addLine(to: CGPoint(x: s * 0.52, y: s * 0.17))
                    p.addCurve(to: CGPoint(x: s * 0.74, y: s * 0.46),
                               control1: CGPoint(x: s * 0.82, y: s * 0.17),
                               control2: CGPoint(x: s * 0.87, y: s * 0.38))
                    p.addCurve(to: CGPoint(x: s * 0.55, y: s * 0.83),
                               control1: CGPoint(x: s * 0.93, y: s * 0.55),
                               control2: CGPoint(x: s * 0.83, y: s * 0.83))
                    p.addLine(to: CGPoint(x: s * 0.24, y: s * 0.83))
                    p.closeSubpath()
                    p.addRoundedRect(in: CGRect(x:s*0.42, y:s*0.29,width:s*0.21,height:s*0.12),
                                     cornerSize: CGSize(width:s*0.055,height:s*0.055))
                    p.addRoundedRect(in: CGRect(x:s*0.42, y:s*0.56,width:s*0.24,height:s*0.14),
                                     cornerSize: CGSize(width:s*0.07,height:s*0.07))
                }
                .fill(.white, style: FillStyle(eoFill: true))
                Circle()
                    .fill(Color(red:0.55,green:0.86,blue:0.68))
                    .frame(width:s*0.095,height:s*0.095)
                    .position(x:s*0.79,y:s*0.20)
            }
        }
        .accessibilityLabel("Budviva")
    }
}
