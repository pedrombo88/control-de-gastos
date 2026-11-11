import SwiftUI

struct SavingsScreen: View {
    @EnvironmentObject var store: FinanceStore
    @State private var selected = 0
    @State private var reduction = 25
    @State private var editingGoal: SavingsGoal?
    @State private var newGoal = false
    @State private var addingTo: SavingsGoal?
    var body: some View {
        ScrollView {
            VStack(alignment:.leading,spacing:18) {
                Picker("Ahorro", selection:$selected) {
                    Text("Analizar compras").tag(0)
                    Text("Mis objetivos").tag(1)
                }.pickerStyle(.segmented)
                if selected == 0 { analysis }
                else { goals }
            }.padding(17)
        }.background(BudvivaPalette(store.theme).canvas.ignoresSafeArea())
         .navigationTitle("Ahorro")
        .toolbar {
            if selected == 1 {
                ToolbarItem(placement:.topBarTrailing) {
                    Button { newGoal=true } label: { Image(systemName:"plus") }
                        .accessibilityLabel("Nuevo objetivo")
                }
            }
        }
        .sheet(isPresented:$newGoal){ GoalEditor(goal:nil) }
        .sheet(item:$editingGoal){ goal in GoalEditor(goal:goal) }
        .sheet(item:$addingTo){ goal in ContributionEditor(goal:goal) }
    }
    private var expenses:[Movement] {
        store.current.filter { $0.type == "expense" }
    }
    private var products:[(String,Int,String,String,Int)] {
        expenses.flatMap { transaction in
            (transaction.receiptItems ?? []).enumerated().map { i,product in
                (product.name,product.amount,product.necessity,transaction.id,i)
            }
        }
    }
    private var optionalTotal:Int { products.filter{$0.2=="optional"}.reduce(0){$0+$1.1} }
    private var potential:Int { optionalTotal*reduction/100 }
    private var analysis:some View {
        VStack(alignment:.leading,spacing:16) {
            VStack(alignment:.leading,spacing:7){
                Text("Ahorro potencial al mes").font(.caption).foregroundStyle(.white.opacity(0.85))
                Text(FinanceFormat.money(potential)).font(.system(size:34,weight:.bold,design:.rounded))
                Text("Simulación reduciendo un \(reduction) % de las compras que has marcado como no necesarias.")
                    .font(.caption).foregroundStyle(.white.opacity(0.9))
                Divider().overlay(.white.opacity(0.2))
                HStack { Text("Estimación a 12 meses");Spacer();Text(FinanceFormat.money(potential*12)).bold() }.font(.subheadline)
            }
            .padding(20).foregroundStyle(.white)
            .background(BudvivaPalette(store.theme).hero,in:RoundedRectangle(cornerRadius:25))
            GroupBox("Tu plan de reducción") {
                VStack(alignment:.leading,spacing:12) {
                    Picker("Reducción",selection:$reduction) {
                        ForEach([10,25,50,75,100],id:\.self) { n in Text("\(n) %").tag(n) }
                    }.pickerStyle(.menu)
                    Text("Compras prescindibles: \(FinanceFormat.money(optionalTotal))")
                    Text("Necesarias: \(FinanceFormat.money(products.filter{$0.2=="necessary"}.reduce(0){$0+$1.1}))")
                    Text("Pendientes de clasificar: \(FinanceFormat.money(products.filter{$0.2 != "necessary" && $0.2 != "optional"}.reduce(0){$0+$1.1}))")
                    Text("Son cifras estimadas, no dinero reservado.").foregroundStyle(.secondary).font(.caption)
                }.font(.subheadline)
            }
            Text("Clasifica los productos de tus tickets").font(.headline)
            if products.isEmpty {
                ContentUnavailableView("No hay tickets desglosados",systemImage:"receipt",
                    description:Text("Importa un ticket desde Movimientos para identificar compras prescindibles."))
            } else {
                ForEach(expenses.filter{!($0.receiptItems ?? []).isEmpty}){ transaction in
                    GroupBox {
                        VStack(alignment:.leading,spacing:12){
                            ForEach((transaction.receiptItems ?? []).indices,id:\.self) { index in
                                let item=transaction.receiptItems![index]
                                HStack(alignment:.center,spacing:8) {
                                    VStack(alignment:.leading,spacing:2){
                                        Text(item.name).font(.subheadline).bold()
                                        Text(FinanceFormat.money(item.amount)).font(.caption).foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Picker("Necesidad",selection:Binding(
                                        get:{store.data.transactions.first(where:{$0.id == transaction.id})?.receiptItems?[index].necessity ?? "pending"},
                                        set:{ newValue in
                                            store.write { model in
                                                if let i=model.transactions.firstIndex(where:{$0.id == transaction.id}),
                                                   model.transactions[i].receiptItems?.indices.contains(index)==true {
                                                    model.transactions[i].receiptItems![index].necessity=newValue
                                                }
                                            }
                                        })) {
                                            Text("Sin clasificar").tag("pending")
                                            Text("Necesario").tag("necessary")
                                            Text("No necesario").tag("optional")
                                        }.labelsHidden()
                                        .accessibilityLabel("Clasificar \(item.name)")
                                }
                            }
                        }
                    } label: { Label(transaction.title,systemImage:"receipt") }
                }
            }
        }
    }
    private var goals:some View {
        VStack(alignment:.leading,spacing:15) {
            let real=store.data.savingsGoals.reduce(0){$0+$1.saved}
            HStack {
                VStack(alignment:.leading,spacing:4){
                    Text("Ahorro real registrado").font(.caption).foregroundStyle(.secondary)
                    Text(FinanceFormat.money(real)).font(.title2).bold()
                }
                Spacer()
                Text("\(store.data.savingsGoals.count) metas").font(.caption).foregroundStyle(.secondary)
            }.padding(17).background(.thinMaterial,in:RoundedRectangle(cornerRadius:16))
            if store.data.savingsGoals.isEmpty {
                ContentUnavailableView {
                    Label("Sin objetivos",systemImage:"target")
                } description: {
                    Text("Crea un objetivo y registra lo que realmente has apartado.")
                } actions: { Button("Crear objetivo"){newGoal=true}.buttonStyle(.borderedProminent) }
            }
            ForEach(store.data.savingsGoals.sorted(by:{$0.dueDate<$1.dueDate})){goal in
                GroupBox {
                    VStack(alignment:.leading,spacing:10) {
                        HStack { Text(FinanceFormat.money(goal.saved)).font(.title3).bold();Text("de \(FinanceFormat.money(goal.target))").font(.caption).foregroundStyle(.secondary) }
                        ProgressView(value:goal.fraction)
                        HStack {
                            Text("\(Int(goal.fraction*100)) % conseguido")
                            Spacer()
                            Text("Faltan \(FinanceFormat.money(goal.remaining))")
                        }.font(.caption).foregroundStyle(.secondary)
                        Text(goal.dueDate).font(.caption).foregroundStyle(.secondary)
                        if goal.remaining > 0 {
                            let days=max(1,Int(FinanceFormat.parsedDate(goal.dueDate).timeIntervalSinceNow/86400))
                            Text("Ritmo necesario: \(FinanceFormat.money(Int(Double(goal.remaining)/max(1,Double(days)/30.44)))) / mes")
                                .font(.caption)
                        }
                        HStack {
                            Button("Aportar"){addingTo=goal}.buttonStyle(.borderedProminent)
                            Button("Editar"){editingGoal=goal}.buttonStyle(.bordered)
                        }
                        if !goal.contributions.isEmpty {
                            DisclosureGroup("Historial (\(goal.contributions.count))") {
                                ForEach(goal.contributions.sorted(by:{$0.date>$1.date})) { c in
                                    HStack {
                                        VStack(alignment:.leading) {
                                            Text(c.date).font(.caption)
                                            if !c.note.isEmpty {Text(c.note).font(.caption2).foregroundStyle(.secondary)}
                                        }
                                        Spacer()
                                        Text(FinanceFormat.money(c.amount))
                                        Button(role:.destructive) {
                                            store.write{ model in
                                                guard let i=model.savingsGoals.firstIndex(where:{$0.id==goal.id}) else{return}
                                                model.savingsGoals[i].contributions.removeAll{$0.id==c.id}
                                            }
                                        } label: { Image(systemName:"trash") }
                                            .accessibilityLabel("Eliminar aportación")
                                    }.font(.caption)
                                }
                            }
                        }
                    }
                } label: { Text(goal.title).font(.headline) }
            }
            Text("Las aportaciones son registros manuales: no transfieren dinero ni cambian tu saldo.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }
}

struct GoalEditor: View {
    @EnvironmentObject var store:FinanceStore
    @Environment(\.dismiss) private var dismiss
    let goal:SavingsGoal?
    @State private var title=""
    @State private var amount=""
    @State private var dueDate=Date()
    @State private var invalid=false
    var body:some View {
        NavigationStack {
            Form {
                TextField("Nombre: vacaciones, emergencia...",text:$title)
                TextField("Cantidad objetivo (€)",text:$amount).keyboardType(.decimalPad)
                DatePicker("Fecha límite",selection:$dueDate,displayedComponents:.date)
                if let goal {
                    Button("Eliminar objetivo",role:.destructive){store.deleteGoal(goal.id);dismiss()}
                }
            }
            .navigationTitle(goal == nil ? "Nuevo objetivo":"Editar objetivo")
            .toolbar {
                ToolbarItem(placement:.cancellationAction){Button("Cancelar"){dismiss()}}
                ToolbarItem(placement:.confirmationAction){Button("Guardar"){save()}}
            }
            .alert("Introduce un nombre e importe válidos",isPresented:$invalid){Button("Aceptar",role:.cancel){}}
            .onAppear {
                if let goal {
                    title=goal.title;amount=String(format:"%.2f",Double(goal.target)/100).replacingOccurrences(of:".",with:",")
                    dueDate=FinanceFormat.parsedDate(goal.dueDate)
                } else {dueDate=Calendar.current.date(byAdding:.year,value:1,to:Date()) ?? Date()}
            }
        }
    }
    private func save(){
        guard !title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty,let cents=FinanceFormat.cents(amount) else {invalid=true;return}
        let next=SavingsGoal(id:goal?.id ?? UUID().uuidString,title:String(title.prefix(65)),
            target:cents,dueDate:FinanceFormat.date(dueDate),
            createdAt:goal?.createdAt ?? FinanceFormat.date(),contributions:goal?.contributions ?? [])
        store.saveGoal(next);dismiss()
    }
}

struct ContributionEditor: View {
    @EnvironmentObject var store:FinanceStore
    @Environment(\.dismiss) private var dismiss
    let goal:SavingsGoal
    @State private var amount=""
    @State private var note=""
    @State private var invalid=false
    var body:some View {
        NavigationStack {
            Form {
                Section("Aportación real"){
                    TextField("Cantidad (€)",text:$amount).keyboardType(.decimalPad)
                    TextField("Nota (opcional)",text:$note)
                    Text("Añade solo dinero que hayas reservado realmente.").font(.caption).foregroundStyle(.secondary)
                }
            }.navigationTitle("Registrar ahorro")
                .toolbar {
                    ToolbarItem(placement:.cancellationAction){Button("Cancelar"){dismiss()}}
                    ToolbarItem(placement:.confirmationAction){Button("Guardar"){
                        guard let cents=FinanceFormat.cents(amount) else {invalid=true;return}
                        store.contribute(to:goal.id,amount:cents,note:String(note.prefix(90)));dismiss()
                    }}
                }
                .alert("Introduce una cantidad válida",isPresented:$invalid){Button("Aceptar",role:.cancel){}}
        }
    }
}
