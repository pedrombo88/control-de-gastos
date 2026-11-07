import SwiftUI
import SafariServices

/// Punto de acceso nativo a Compartidos durante la beta.
/// La sesión web se gestiona por SafariServices. La app no recibe ni almacena
/// contraseñas, tokens OTP, movimientos ni cookies del servicio Compartidos.
enum SharedExpensesService {
    static let url = URL(string: "https://pedrombo88.github.io/control-de-gastos/compartidos.html")!
    static let privacyURL = URL(string: "https://pedrombo88.github.io/control-de-gastos/datos-y-privacidad.html")!
}

struct SharedExpensesScreen: View {
    @State private var showingShared = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 10) {
                    Image(systemName: "person.2.circle.fill")
                        .font(.system(size: 38))
                        .foregroundStyle(.teal)
                        .accessibilityHidden(true)
                    Text("Gastos compartidos").font(.title2).bold()
                    Text("Organiza los gastos de dos personas, consulta el saldo común y registra compensaciones sin mover dinero entre cuentas.")
                        .foregroundStyle(.secondary)
                }

                Button {
                    showingShared = true
                } label: {
                    Label("Abrir Compartidos", systemImage: "arrow.up.forward.app")
                        .fontWeight(.semibold)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 8)
                }
                .buttonStyle(.borderedProminent)
                .accessibilityHint("Abre el servicio de Compartidos dentro de una ventana segura de Safari")

                GroupBox {
                    VStack(alignment: .leading, spacing: 12) {
                        Label("Requiere conexión a Internet", systemImage: "wifi")
                        Label("Inicio de sesión independiente", systemImage: "lock.shield")
                        Label("Tus movimientos privados no se suben ni sincronizan automáticamente", systemImage: "iphone")
                    }
                    .font(.subheadline)
                    .frame(maxWidth: .infinity, alignment: .leading)
                } label: {
                    Text("Antes de entrar")
                }

                Text("Durante esta beta, Compartidos se muestra mediante Safari en una ventana integrada. Su sesión y los gastos comunes se gestionan por separado de los movimientos privados guardados en este iPhone.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)

                Link(destination: SharedExpensesService.privacyURL) {
                    Label("Privacidad y gestión de la cuenta", systemImage: "hand.raised")
                        .font(.subheadline)
                }
            }
            .padding(18)
        }
        .navigationTitle("Compartidos")
        .navigationBarTitleDisplayMode(.inline)
        .fullScreenCover(isPresented: $showingShared) {
            SharedExpensesBrowser(isPresented: $showingShared)
                .ignoresSafeArea()
        }
    }
}

/// SafariServices mantiene las credenciales fuera del código de Budviva.
/// El delegado sincroniza el botón «Cerrar» del navegador con el estado SwiftUI:
/// volver a abrir Compartidos siempre presenta una ventana nueva.
private struct SharedExpensesBrowser: UIViewControllerRepresentable {
    @Binding var isPresented: Bool

    func makeCoordinator() -> Coordinator {
        Coordinator(isPresented: $isPresented)
    }

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: SharedExpensesService.url)
        controller.delegate = context.coordinator
        controller.dismissButtonStyle = .close
        controller.preferredControlTintColor = UIColor.systemTeal
        return controller
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}

    final class Coordinator: NSObject, SFSafariViewControllerDelegate {
        @Binding var isPresented: Bool

        init(isPresented: Binding<Bool>) {
            _isPresented = isPresented
        }

        func safariViewControllerDidFinish(_ controller: SFSafariViewController) {
            isPresented = false
        }
    }
}
