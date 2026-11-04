import SwiftUI
import Charts

struct HomeScreen: View {
    @EnvironmentObject var store: FinanceStore
    @Binding var selected: Int
    @State private var adding = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Tu dinero, más claro").font(.subheadline).foregroundStyle(.secondary)
                    Text(FinanceFormat.money(store.balance))
                        .font(.system(size: 35, weight: .bold, design: .rounded))
                    Text("Balance de este mes").font(.caption).foregroundStyle(.secondary)
                    HStack(spacing: 20) {
                        summary("Ingresos", store.income, "arrow.down.left")
                        Spacer()
                        summary("Gastos", store.expense, "arrow.up.right")
                    }.padding(.top, 10)
                }
                .padding(21)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(LinearGradient(colors: [.init(red:0.08,green:0.22,blue:0.48),.init(red:0.15,green:0.40,blue:0.78)],startPoint:.topLeading,endPoint:.bottomTrailing),in:RoundedRectangle(cornerRadius:23))
                HStack {
                    Button { adding = true } label: { Label("Añadir gasto", systemImage:"plus.circle.fill").frame(maxWidth:.infinity) }
                        .buttonStyle(.borderedProminent)
                    Button { selected=1 } label: { Label("Importar",systemImage:"doc.text.viewfinder").frame(maxWidth:.infinity) }
                        .buttonStyle(.bordered)
                }
                let warnings = FinanceCategory.expense.filter { id,_ in
                    guard let budget=store.data.budgets[id],budget>0 else { return false }
                    return (store.current.filter { $0.type=="expense" && $0.category==id }.reduce(0) {$0+$1.amount}) * 100 / budget >= store.data.budgetAlerts.threshold
                }
                if store.data.budgetAlerts.enabled && !warnings.isEmpty {
                    GroupBox {
                        VStack(alignment:.leading,spacing:6) {
                            ForEach(warnings,id:\.0) { item in Text(item.1).font(.subheadline) }
                            Text("Una o más categorías alcanzaron el umbral de aviso.").font(.caption).foregroundStyle(.secondary)
                        }
                    } label: { Label("Avisos de presupuesto",systemImage:"exclamationmark.triangle").foregroundStyle(.orange) }
                    .onTapGesture { selected=2 }
                }
                if let goal=store.data.savingsGoals.sorted(by:{$0.dueDate<$1.dueDate}).first {
                    GroupBox {
                        VStack(alignment:.leading,spacing:9) {
                            HStack { Text(goal.title).bold(); Spacer();Text("\(Int(goal.fraction*100)) %").font(.caption).bold() }
                            ProgressView(value:goal.fraction)
                            Text("\(FinanceFormat.money(goal.saved)) de \(FinanceFormat.money(goal.target)) reservados")
                                .font(.caption).foregroundStyle(.secondary)
                        }.onTapGesture { selected=3 }
                    } label: { Label("Meta de ahorro",systemImage:"target") }
                }
                VStack(alignment:.leading,spacing:12) {
                    HStack {
                        Text("Últimos movimientos").font(.headline)
                        Spacer()
                        Button("Ver todos") { selected=1 }.font(.subheadline)
                    }
                    ForEach(store.current.sorted(by:{$0.date>$1.date}).prefix(4)) { row in
                        MovementRow(movement:row)
                        Divider()
                    }
                    if store.current.isEmpty { ContentUnavailableView("Sin movimientos",systemImage:"eurosign.circle",description:Text("Añade un gasto o ingreso para comenzar.")) }
                }
            }.padding(17)
        }
        .navigationTitle("Budviva")
        .sheet(isPresented:$adding) { EntryEditor(entry:nil) }
    }
    private func summary(_ name:String,_ value:Int,_ icon:String) -> some View {
        VStack(alignment:.leading,spacing:3) {
            Label(name,systemImage:icon).font(.caption)
            Text(FinanceFormat.money(value)).font(.callout).bold()
        }
    }
}

struct MovementRow: View {
    var movement: Movement
    var body: some View {
        HStack {
            Image(systemName: movement.type=="income" ? "arrow.down.left.circle" : "arrow.up.right.circle")
                .font(.title2)
                .foregroundStyle(movement.type=="income" ? .green:.orange)
                .accessibilityHidden(true)
            VStack(alignment:.leading,spacing:3) {
                Text(movement.title).font(.subheadline).fontWeight(.semibold)
                Text("\(FinanceCategory.title(movement.category)) · \(movement.date)")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            Text((movement.type=="income" ? "+" : "−")+FinanceFormat.money(movement.amount))
                .font(.subheadline).bold()
        }.padding(.vertical,5)
    }
}

struct MovementsScreen: View {
    @EnvironmentObject var store: FinanceStore
    @State private var filter="all"
    @State private var query=""
    @State private var showEditor=false
    @State private var editing:Movement?
    @State private var selectedTool: Tool?
    enum Tool:String,Identifiable { case importFiles,recurring,statistics; var id:String{rawValue} }
    private var visible: [Movement] {
        store.data.transactions.filter {
            (filter=="all" || $0.type==filter) &&
            (query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) || FinanceCategory.title($0.category).localizedCaseInsensitiveContains(query))
        }.sorted { $0.date == $1.date ? $0.id > $1.id : $0.date > $1.date }
    }
    var body: some View {
        VStack(spacing:0) {
            HStack(spacing:10) {
                tool("Importar","doc.text.viewfinder",.importFiles)
                tool("Recurrentes","repeat",.recurring)
                tool("Estadísticas","chart.bar",.statistics)
            }.padding(.horizontal,16).padding(.vertical,12)
            Picker("Tipo",selection:$filter) {
                Text("Todos").tag("all");Text("Gastos").tag("expense");Text("Ingresos").tag("income")
            }.pickerStyle(.segmented).padding(.horizontal,16)
            List {
                ForEach(visible) { movement in
                    Button {
                        editing=movement;showEditor=true
                    } label: { MovementRow(movement:movement).foregroundStyle(.primary) }
                }
                .onDelete { offsets in
                    let rows=visible
                    offsets.forEach { store.delete(rows[$0].id) }
                }
            }.searchable(text:$query,prompt:"Buscar concepto o categoría")
                .overlay { if visible.isEmpty { ContentUnavailableView.search(text:query) } }
        }
        .navigationTitle("Movimientos")
        .toolbar { ToolbarItem(placement:.topBarTrailing) {
            Button { editing=nil;showEditor=true } label: { Image(systemName:"plus") }
                .accessibilityLabel("Nuevo movimiento")
        }}
        .sheet(isPresented:$showEditor,onDismiss:{editing=nil}) { EntryEditor(entry:editing) }
        .sheet(item:$selectedTool) { tool in
            NavigationStack {
                Group {
                    switch tool {
                    case .importFiles: ImportScreen()
                    case .recurring: RecurringScreen()
                    case .statistics: StatisticsScreen()
                    }
                }
                .toolbar { ToolbarItem(placement:.topBarTrailing) { Button("Cerrar"){selectedTool=nil} } }
            }
        }
    }
    private func tool(_ title:String,_ icon:String,_ value:Tool)->some View {
        Button { selectedTool=value } label: {
            VStack(spacing:6) { Image(systemName:icon).font(.title3);Text(title).font(.caption2).bold() }
                .frame(maxWidth:.infinity).frame(height:60)
        }.buttonStyle(.bordered)
    }
}

struct EntryEditor: View {
    @EnvironmentObject var store:FinanceStore
    @Environment(\.dismiss) private var dismiss
    var entry:Movement?
    @State private var type="expense"
    @State private var title=""
    @State private var amount=""
    @State private var category="alimentacion"
    @State private var date=Date()
    @State private var note=""
    @State private var method="card"
    @State private var invalid=false
    var body:some View {
        NavigationStack {
            Form {
                Section("Importe") { TextField("0,00 €",text:$amount).keyboardType(.decimalPad).font(.title2) }
                Section("Movimiento") {
                    Picker("Tipo",selection:$type) { Text("Gasto").tag("expense");Text("Ingreso").tag("income") }
                        .onChange(of:type) { _,next in category=next=="income" ? "nomina":"alimentacion" }
                    TextField("Concepto",text:$title)
                    Picker("Categoría",selection:$category) {
                        ForEach(type=="income" ? FinanceCategory.income:FinanceCategory.expense,id:\.0) { id,name in Text(name).tag(id) }
                    }
                    DatePicker("Fecha",selection:$date,in:...Date(),displayedComponents:.date)
                    Picker("Método",selection:$method) {
                        Text("Tarjeta").tag("card");Text("Efectivo").tag("cash");Text("Otro").tag("other")
                    }
                    TextField("Nota",text:$note)
                }
                if entry != nil {
                    Section { Button("Eliminar movimiento",role:.destructive){
                        store.delete(entry!.id);dismiss()
                    }}
                }
            }
            .navigationTitle(entry == nil ? "Nuevo movimiento":"Editar movimiento")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement:.cancellationAction) { Button("Cancelar"){dismiss()} }
                ToolbarItem(placement:.confirmationAction) { Button("Guardar"){save()} }
            }
            .alert("Revisa los datos",isPresented:$invalid) { Button("Aceptar",role:.cancel){} }
                message:{Text("Introduce un concepto y una cantidad válida mayor de cero.")}
            .onAppear {
                guard let entry else { return }
                type=entry.type;title=entry.title;amount=String(format:"%.2f",Double(entry.amount)/100).replacingOccurrences(of:".",with:",")
                category=entry.category;date=FinanceFormat.parsedDate(entry.date);note=entry.note ?? "";method=entry.method ?? "card"
            }
        }
    }
    private func save() {
        guard !title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty,let cents=FinanceFormat.cents(amount) else { invalid=true;return }
        let next=Movement(id:entry?.id ?? UUID().uuidString,type:type,amount:cents,date:FinanceFormat.date(date),
                          title:String(title.prefix(90)),category:category,method:method,note:String(note.prefix(200)),
                          receiptItems:type=="expense" ? entry?.receiptItems:nil,
                          sourceDocumentIds:entry?.sourceDocumentIds,importSource:entry?.importSource,
                          recurringId:entry?.recurringId,occurrenceDate:entry?.occurrenceDate)
        store.save(next);dismiss()
    }
}

struct BudgetsScreen: View {
    @EnvironmentObject var store:FinanceStore
    @State private var editingCategory:String?
    @State private var amount=""
    private var current: [Movement] { store.current.filter { $0.type == "expense" } }
    var body: some View {
        List {
            Section("Avisos de gasto") {
                Toggle("Avisarme al alcanzar un límite",isOn:Binding(get:{store.data.budgetAlerts.enabled},set:{value in store.write{$0.budgetAlerts.enabled=value}}))
                Picker("Umbral",selection:Binding(get:{store.data.budgetAlerts.threshold},set:{n in store.write{$0.budgetAlerts.threshold=n}})) {
                    Text("70 %").tag(70);Text("80 %").tag(80);Text("90 %").tag(90)
                }.disabled(!store.data.budgetAlerts.enabled)
            }
            Section("Límites por categoría") {
                ForEach(FinanceCategory.expense,id:\.0) { item in
                    let used=current.filter{$0.category==item.0}.reduce(0){$0+$1.amount}
                    let limit=store.data.budgets[item.0]
                    Button {
                        editingCategory=item.0
                        amount=limit.map { String(format:"%.2f",Double($0)/100).replacingOccurrences(of:".",with:",") } ?? ""
                    } label: {
                        VStack(alignment:.leading,spacing:6) {
                            HStack {
                                Text(item.1).foregroundStyle(.primary)
                                Spacer()
                                Text(limit.map{FinanceFormat.money($0)} ?? "Sin límite").foregroundStyle(.secondary)
                            }
                            if let limit,limit>0 {
                                ProgressView(value:min(1,Double(used)/Double(limit)))
                                    .tint(used>=limit ? .red:.blue)
                            }
                            Text("Gastados: "+FinanceFormat.money(used)).font(.caption).foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }.navigationTitle("Presupuestos")
        .sheet(item:Binding(get:{editingCategory.map{CategoryID(id:$0)}},set:{editingCategory=$0?.id})) { chosen in
            NavigationStack {
                Form {
                    Text("Límite mensual de "+FinanceCategory.title(chosen.id)).font(.headline)
                    TextField("Importe en euros",text:$amount).keyboardType(.decimalPad)
                    Button("Eliminar límite",role:.destructive){store.setBudget(chosen.id,amount:nil);editingCategory=nil}
                }
                .navigationTitle("Presupuesto")
                .toolbar {
                    ToolbarItem(placement:.cancellationAction){Button("Cancelar"){editingCategory=nil}}
                    ToolbarItem(placement:.confirmationAction){Button("Guardar"){
                        if let cents=FinanceFormat.cents(amount) {store.setBudget(chosen.id,amount:cents);editingCategory=nil}
                    }}
                }
            }.presentationDetents([.medium])
        }
    }
}
struct CategoryID: Identifiable { var id:String }

struct StatisticsScreen: View {
    @EnvironmentObject var store:FinanceStore
    @State private var months=6
    struct MonthPoint:Identifiable { let month:String;let income:Int;let expense:Int;var id:String{month} }
    var points:[MonthPoint] {
        let cal=Calendar.current
        return (0..<months).reversed().compactMap { back in
            guard let date=cal.date(byAdding:.month,value:-back,to:Date()) else{return nil}
            let key=String(FinanceFormat.date(date).prefix(7))
            let entries=store.data.transactions.filter{$0.date.hasPrefix(key)}
            return MonthPoint(month:key,income:entries.filter{$0.type=="income"}.reduce(0){$0+$1.amount},expense:entries.filter{$0.type=="expense"}.reduce(0){$0+$1.amount})
        }
    }
    var body:some View {
        ScrollView {
            VStack(alignment:.leading,spacing:18) {
                Picker("Periodo",selection:$months) { Text("3 meses").tag(3);Text("6 meses").tag(6);Text("12 meses").tag(12) }.pickerStyle(.segmented)
                Chart {
                    ForEach(points) { p in
                        BarMark(x:.value("Mes",p.month),y:.value("Ingresos",Double(p.income)/100))
                            .foregroundStyle(by:.value("Tipo","Ingresos")).position(by:.value("Tipo","Ingresos"))
                        BarMark(x:.value("Mes",p.month),y:.value("Gastos",Double(p.expense)/100))
                            .foregroundStyle(by:.value("Tipo","Gastos")).position(by:.value("Tipo","Gastos"))
                    }
                }.frame(height:260)
                Text("Gastos por categoría").font(.headline)
                ForEach(FinanceCategory.expense,id:\.0) { id,name in
                    let sum=store.data.transactions.filter { $0.type=="expense" && $0.category==id && points.map(\.month).contains(String($0.date.prefix(7))) }.reduce(0){$0+$1.amount}
                    if sum>0 { HStack {Text(name);Spacer();Text(FinanceFormat.money(sum))}.font(.subheadline) }
                }
                Text("Los importes son registros y no constituyen asesoramiento financiero.")
                    .font(.caption).foregroundStyle(.secondary)
            }.padding(17)
        }.navigationTitle("Estadísticas")
    }
}
