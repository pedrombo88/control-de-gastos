import SwiftUI
import Security

/// Impide que iniciar sesión con una cuenta distinta muestre el historial
/// financiero que ya existe en este dispositivo. No borra ni migra archivos.
enum BudvivaLocalAccountGuard {
    private static let service = "com.budviva.local-finance-owner"
    private static let account = "primary-account-v1"

    static func currentOwner() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data=result as? Data,
              let value=String(data:data,encoding:.utf8),
              !value.isEmpty else { return nil }
        return value
    }

    /// La primera sesión tras actualizar reclama el almacenamiento local.
    /// Nunca permite una segunda identidad sin borrar previamente los datos.
    static func checkOrBind(_ userID: String) -> Bool {
        guard !userID.isEmpty else { return false }
        if let current=currentOwner() { return current==userID }
        let payload=Data(userID.utf8)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecValueData as String: payload,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status=SecItemAdd(query as CFDictionary,nil)
        return status==errSecSuccess || currentOwner()==userID
    }

    /// Solo liberar el vínculo después de borrar expresamente los datos locales.
    static func releaseAfterWipe() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
    }
}

struct BudvivaOtherAccountScreen: View {
    @EnvironmentObject private var auth: BudvivaAuth
    @EnvironmentObject private var store: FinanceStore
    @State private var confirmWipe = false
    @State private var notice: String?

    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:20) {
                Image(systemName:"lock.shield.fill")
                    .font(.system(size:48))
                    .foregroundStyle(Color(red:0.09,green:0.36,blue:0.67))
                Text("Datos de otra cuenta")
                    .font(.title.bold())
                Text("Este iPhone contiene datos personales vinculados a una cuenta diferente. Para protegerlos, Budviva no mostrará movimientos, documentos ni presupuestos con esta sesión.")
                Text("Si acabas de cambiar de cuenta, cierra sesión e inicia con la anterior. Si quieres reutilizar este iPhone con otra cuenta, primero debes contar con una copia de seguridad de los datos anteriores.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Button("Cerrar sesión") { auth.signOut() }
                    .buttonStyle(.borderedProminent)
                Button("Borrar datos locales y utilizar esta cuenta",role:.destructive) {
                    confirmWipe=true
                }
                .buttonStyle(.bordered)
                Text("El borrado es irreversible si no dispones de una copia exportada. No modifica las cuentas ni los gastos de Compartidos.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                if let notice {
                    Text(notice).foregroundStyle(.red).font(.footnote)
                }
            }
            .frame(maxWidth:480,alignment:.leading)
            .padding(26)
            .frame(maxWidth:.infinity,alignment:.topLeading)
        }
        .background(Color(.systemGroupedBackground))
        .confirmationDialog("¿Eliminar los datos financieros de este iPhone?",isPresented:$confirmWipe,titleVisibility:.visible) {
            Button("Borrar definitivamente y desbloquear",role:.destructive) {
                do {
                    try store.wipe()
                    BudvivaLocalAccountGuard.releaseAfterWipe()
                    auth.signOut()
                } catch {
                    notice="No se han podido borrar los datos: " + error.localizedDescription
                }
            }
            Button("Cancelar",role:.cancel){}
        } message: {
            Text("Se eliminarán los movimientos, metas y documentos locales, sin posibilidad de recuperación sin una copia. No afecta a Compartidos.")
        }
    }
}
