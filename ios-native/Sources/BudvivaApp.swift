import SwiftUI

@main
struct BudvivaApp: App {
    @StateObject private var store = FinanceStore()
    @StateObject private var auth = BudvivaAuth()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .environmentObject(auth)
                .preferredColorScheme(store.theme == "noche" ? .dark : .light)
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: FinanceStore
    @EnvironmentObject private var auth: BudvivaAuth
    @State private var selected = 0

    var body: some View {
        Group {
            if auth.isChecking {
                ProgressView("Verificando tu cuenta…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let id = auth.userID, store.activeAccount == id {
                tabs
            } else if auth.userID != nil {
                ProgressView("Preparando tus datos…")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                BudvivaLoginScreen()
            }
        }
        .task(id: auth.userID) {
            store.selectAccount(auth.userID)
            selected = 0
        }
    }

    private var tabs: some View {
        TabView(selection: $selected) {
            NavigationStack {
                HomeScreen(selected: $selected)
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            NavigationLink {
                                SettingsScreen()
                            } label: {
                                Image(systemName: "gearshape")
                            }
                            .accessibilityLabel("Ajustes")
                        }
                    }
            }
            .tabItem { Label("Inicio", systemImage: "house") }.tag(0)

            NavigationStack { MovementsScreen() }
                .tabItem { Label("Movimientos", systemImage: "list.bullet.rectangle") }.tag(1)

            NavigationStack { BudgetsScreen() }
                .tabItem { Label("Presupuestos", systemImage: "chart.pie") }.tag(2)

            NavigationStack { SavingsScreen() }
                .tabItem { Label("Ahorro", systemImage: "target") }.tag(3)

            NavigationStack { SharedExpensesScreen() }
                .tabItem { Label("Compartidos", systemImage: "person.2.fill") }.tag(4)
        }
        .tint(BudvivaPalette(store.theme).accent)
        .toolbarBackground(BudvivaPalette(store.theme).surface, for: .tabBar)
        .toolbarBackground(.visible, for: .tabBar)
        .alert("Aviso de Budviva", isPresented: Binding(
            get: { store.errorMessage != nil },
            set: { if !$0 { store.errorMessage = nil } })) {
            Button("Aceptar") { store.errorMessage = nil }
        } message: {
            Text(store.errorMessage ?? "")
        }
    }
}
