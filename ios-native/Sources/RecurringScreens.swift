import SwiftUI

struct RecurringScreen: View {
    @EnvironmentObject var store: FinanceStore
    @State private var editing: RecurringRule?
    @State private var adding = false

    var body: some View {
        List {
            Section {
                HStack {
                    VStack(alignment: .leading) {
                        Text("Gastos previstos / mes").font(.caption).foregroundStyle(.secondary)
                        Text(FinanceFormat.money(monthly("expense"))).font(.title3).bold()
                    }
                    Spacer()
                    VStack(alignment: .trailing) {
                        Text("Ingresos previstos / mes").font(.caption).foregroundStyle(.secondary)
                        Text(FinanceFormat.money(monthly("income"))).font(.title3).bold()
                    }
                }.padding(.vertical, 7)
            } footer: {
                Text("La estimación distribuye las frecuencias en un mes aproximado. Los movimientos se registran al abrir Budviva; no se ejecutan mientras está cerrada.")
            }
            Section("Mis reglas") {
                ForEach(store.data.recurring) { rule in
                    Button { editing=rule } label: {
                        HStack(spacing: 12) {
                            Image(systemName: rule.type=="income" ? "arrow.down.left.circle" : "repeat.circle")
                                .font(.title3)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(rule.title).font(.subheadline).bold()
                                Text("\(frequencyLabel(rule.frequency)) · \(FinanceCategory.title(rule.category))")
                                    .font(.caption).foregroundStyle(.secondary)
                                Text(rule.active == false ? "En pausa" : "Desde \(rule.start)")
                                    .font(.caption2).foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(FinanceFormat.money(rule.amount))
                                .font(.subheadline).bold()
                        }.foregroundStyle(.primary)
                    }
                }
                .onDelete { indexes in
                    let rules=store.data.recurring
                    indexes.forEach { store.removeRecurring(rules[$0].id) }
                }
                if store.data.recurring.isEmpty {
                    ContentUnavailableView("Sin movimientos periódicos",systemImage: "repeat",
                        description: Text("Añade tu nómina, alquiler o suscripciones."))
                }
            }
        }
        .navigationTitle("Recurrentes")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button { adding=true } label: { Image(systemName: "plus") }
                    .accessibilityLabel("Nueva regla periódica")
            }
        }
        .sheet(isPresented:$adding) { RecurringEditor(rule:nil) }
        .sheet(item:$editing) { rule in RecurringEditor(rule:rule) }
        .onAppear { store.syncRecurring() }
    }

    private func monthly(_ type:String)->Int {
        let total=store.data.recurring.filter {($0.active != false) && $0.type==type}.reduce(0.0) { sum,rule in
            let factor:Double
            switch rule.frequency {
            case "daily": factor=365.25/12
            case "weekly":factor=52.18/12
            case "yearly":factor=1/12
            default:factor=1
            }
            return sum+Double(rule.amount)*factor
        }
        return Int(total.rounded())
    }
}

private func frequencyLabel(_ key:String)->String {
    switch key {
    case "daily":return "Diario"
    case "weekly":return "Semanal"
    case "yearly":return "Anual"
    default:return "Mensual"
    }
}

struct RecurringEditor: View {
    @EnvironmentObject var store:FinanceStore
    @Environment(\.dismiss) private var dismiss
    let rule:RecurringRule?
    @State private var title=""
    @State private var amount=""
    @State private var type="expense"
    @State private var category="alimentacion"
    @State private var frequency="monthly"
    @State private var start=Date()
    @State private var active=true
    @State private var method="card"
    @State private var invalid=false

    var body:some View {
        NavigationStack {
            Form {
                Section("Regla") {
                    TextField("Concepto",text:$title)
                    TextField("Importe en euros",text:$amount).keyboardType(.decimalPad)
                    Picker("Tipo",selection:$type) {
                        Text("Gasto").tag("expense")
                        Text("Ingreso").tag("income")
                    }.onChange(of:type) { _,next in category=next=="income" ? "nomina":"alimentacion" }
                    Picker("Categoría",selection:$category) {
                        ForEach((type=="income" ? FinanceCategory.income:FinanceCategory.expense).indices,id:\.self) { index in
                            let item=(type=="income" ? FinanceCategory.income:FinanceCategory.expense)[index]
                            Text(item.1).tag(item.0)
                        }
                    }
                    Picker("Frecuencia",selection:$frequency) {
                        Text("Diaria").tag("daily")
                        Text("Semanal").tag("weekly")
                        Text("Mensual").tag("monthly")
                        Text("Anual").tag("yearly")
                    }
                    DatePicker("Fecha de inicio",selection:$start,displayedComponents:.date)
                    Toggle("Regla activa",isOn:$active)
                }
                Section {
                    Text("Budviva comprobará los vencimientos cuando abras la aplicación. Podrás editar o eliminar cada movimiento después.")
                        .font(.caption).foregroundStyle(.secondary)
                }
                if rule != nil {
                    Section {
                        Button("Eliminar regla",role:.destructive) {
                            store.removeRecurring(rule!.id)
                            dismiss()
                        }
                    }
                }
            }
            .navigationTitle(rule == nil ? "Nueva regla":"Editar regla")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement:.cancellationAction) {Button("Cancelar"){dismiss()}}
                ToolbarItem(placement:.confirmationAction) {Button("Guardar"){save()}}
            }
            .alert("Revisa la regla",isPresented:$invalid) {Button("Aceptar",role:.cancel){}}
                message: {Text("Introduce un concepto e importe válidos.")}
            .onAppear {
                guard let rule else {return}
                title=rule.title
                amount=String(format:"%.2f",Double(rule.amount)/100).replacingOccurrences(of:".",with:",")
                type=rule.type
                category=rule.category
                frequency=rule.frequency
                start=FinanceFormat.parsedDate(rule.start)
                active=rule.active ?? true
                method=rule.method ?? "card"
            }
        }
    }
    private func save() {
        guard let cents=FinanceFormat.cents(amount),
              !title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else{invalid=true;return}
        let next=RecurringRule(id:rule?.id ?? UUID().uuidString,type:type,
            start:FinanceFormat.date(start),amount:cents,title:String(title.prefix(90)),
            category:category,frequency:frequency,method:method,
            active:active,from:rule?.from ?? FinanceFormat.date())
        store.saveRecurring(next)
        dismiss()
    }
}
