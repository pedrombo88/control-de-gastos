import SwiftUI

@main
struct BudvivaApp: App {
    @StateObject private var store = FinanceStore()
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
                .preferredColorScheme(store.theme == "noche" ? .dark : .light)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: FinanceStore
    @State private var selected = 0
    var body: some View {
        TabView(selection: $selected) {
            NavigationStack { HomeScreen(selected: $selected) }
                .tabItem { Label("Inicio", systemImage: "house") }.tag(0)
            NavigationStack { MovementsScreen() }
                .tabItem { Label("Movimientos", systemImage: "list.bullet.rectangle") }.tag(1)
            NavigationStack { BudgetsScreen() }
                .tabItem { Label("Presupuestos", systemImage: "chart.pie") }.tag(2)
            NavigationStack { SavingsScreen() }
                .tabItem { Label("Ahorro", systemImage: "target") }.tag(3)
            NavigationStack { SettingsScreen() }
                .tabItem { Label("Ajustes", systemImage: "gearshape") }.tag(4)
        }
        .tint(BudvivaPalette(store.theme).accent)
        .toolbarBackground(BudvivaPalette(store.theme).surface, for:.tabBar)
        .toolbarBackground(.visible, for:.tabBar)
        .alert("Aviso de Budviva", isPresented: Binding(get: { store.errorMessage != nil }, set: { if !$0 { store.errorMessage=nil } })) {
            Button("Aceptar") { store.errorMessage=nil }
        } message: {
            Text(store.errorMessage ?? "")
        }
    }
}
