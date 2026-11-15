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
    @StateObject private var guestStore = FinanceStore(storageFolderName:"BudvivaGuest")
    @State private var selected = 0
    @State private var checkedUserID: String?
    @State private var localAccessAllowed = false

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
            } else if auth.guestMode {
                authenticated
                    .environmentObject(guestStore)
            } else if auth.session == nil {
                BudvivaLoginScreen()
            } else if checkedUserID != auth.session?.userID {
                ProgressView("Protegiendo los datos del iPhone…")
                    .frame(maxWidth:.infinity,maxHeight:.infinity)
            } else if localAccessAllowed {
                authenticated
            } else {
                BudvivaOtherAccountScreen()
            }
        }
        .task(id:auth.session?.userID) {
            checkedUserID=nil
            guard let uid=auth.session?.userID else {return}
            localAccessAllowed=BudvivaLocalAccountGuard.checkOrBind(uid)
            checkedUserID=uid
        }
        .preferredColorScheme(["noche","arena"].contains(currentStore.theme) ? .dark : .light)
        .alert("Aviso de Budviva", isPresented: Binding(
            get: { currentStore.errorMessage != nil },
            set: { if !$0 { currentStore.errorMessage=nil } }
        )) {
            Button("Aceptar") { currentStore.errorMessage=nil }
        } message: {
            Text(currentStore.errorMessage ?? "")
        }
    }

    private var currentStore: FinanceStore { auth.guestMode ? guestStore : store }

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
                        .foregroundStyle(selected==index ? BudvivaPalette(currentStore.theme).accent:Color.secondary)
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
            .background(BudvivaPalette(currentStore.theme).surface)
            .overlay(alignment:.top) { Rectangle().fill(BudvivaPalette(currentStore.theme).accent.opacity(0.13)).frame(height:1) }
        }
    }
}
