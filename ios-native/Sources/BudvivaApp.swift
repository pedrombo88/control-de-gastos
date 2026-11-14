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
                .preferredColorScheme(["noche","arena"].contains(store.theme) ? .dark : .light)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: FinanceStore
    @EnvironmentObject var auth: BudvivaAuth
    @State private var selected = 0

    private let tabs: [(title: String, icon: String)] = [
        ("Inicio","house.fill"),
        ("Movimientos","list.bullet.rectangle"),
        ("Presupuestos","chart.pie.fill"),
        ("Ahorro","target"),
        ("Compartidos","person.2.fill"),
        ("Ajustes","gearshape.fill")
    ]

    var body: some View {
        Group {
            if auth.checking {
                VStack(spacing:16) {
                    ProgressView()
                    Text("Comprobando sesión…").font(.subheadline).foregroundStyle(.secondary)
                }
                .frame(maxWidth:.infinity,maxHeight:.infinity)
                .background(Color(red:0.95,green:0.97,blue:0.99))
            } else if auth.session == nil {
                BudvivaLoginScreen()
            } else {
                authenticated
            }
        }
        .alert("Aviso de Budviva", isPresented: Binding(
            get: { store.errorMessage != nil },
            set: { if !$0 { store.errorMessage=nil } }
        )) {
            Button("Aceptar") { store.errorMessage=nil }
        } message: {
            Text(store.errorMessage ?? "")
        }
    }

    /// Barra propia de seis elementos: TabView mostraría «Más» y ocultaría Compartidos.
    private var authenticated: some View {
        Group {
            switch selected {
            case 0: NavigationStack { HomeScreen(selected:$selected) }
            case 1: NavigationStack { MovementsScreen() }
            case 2: NavigationStack { BudgetsScreen() }
            case 3: NavigationStack { SavingsScreen() }
            case 4: NavigationStack { SharedExpensesScreen() }
            default: NavigationStack { SettingsScreen() }
            }
        }
        .safeAreaInset(edge:.bottom,spacing:0) {
            HStack(spacing:2) {
                ForEach(tabs.indices,id:\.self) { index in
                    Button { selected=index } label: {
                        VStack(spacing:5) {
                            Image(systemName:tabs[index].icon)
                                .font(.system(size:19,weight:selected==index ? .semibold:.regular))
                                .frame(height:23)
                            Text(tabs[index].title)
                                .font(.system(size:9,weight:selected==index ? .bold:.medium))
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                        }
                        .foregroundStyle(selected==index ? BudvivaPalette(store.theme).accent:Color.secondary)
                        .frame(maxWidth:.infinity,minHeight:50)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("budviva-tab-\(tabs[index].title)")
                    .accessibilityLabel(tabs[index].title)
                    .accessibilityAddTraits(selected==index ? [.isSelected]:[])
                }
            }
            .padding(.horizontal,6)
            .padding(.vertical,5)
            .background(BudvivaPalette(store.theme).surface)
            .overlay(alignment:.top) { Rectangle().fill(BudvivaPalette(store.theme).accent.opacity(0.13)).frame(height:1) }
        }
    }
}
