/* Control de Gastos V3: análisis financiero sin conexiones ni dependencias. */
(function (root) {
  "use strict";
  const two = n => String(n).padStart(2, "0");
  function monthsFor(count, today) {
    const [year, month] = today.slice(0,7).split("-").map(Number);
    const result = [];
    for (let i=count-1; i>=0; i--) {
      const d = new Date(year, month-1-i, 15, 12);
      result.push(d.getFullYear() + "-" + two(d.getMonth()+1));
    }
    return result;
  }
  function aggregate(transactions, keys) {
    const map = new Map(keys.map(k => [k, {month:k, income:0, expense:0, count:0}]));
    for (const t of transactions) {
      if (!t || !map.has(String(t.date||"").slice(0,7))) continue;
      if (!Number.isSafeInteger(t.amount) || t.amount<=0 || !["expense","income"].includes(t.type)) continue;
      const bucket = map.get(t.date.slice(0,7));
      bucket[t.type] += t.amount;
      bucket.count++;
    }
    return keys.map(k => map.get(k));
  }
  function categoriesFor(transactions, keys, type, cats) {
    const allowed = new Set(keys);
    const labels = new Map(cats.filter(c=>c.type===type).map(c=>[c.id,c]));
    const totals = new Map();
    let total = 0;
    for (const t of transactions) {
      if (!t || t.type!==type || !allowed.has(String(t.date||"").slice(0,7))) continue;
      if (!Number.isSafeInteger(t.amount) || t.amount<=0) continue;
      const id=labels.has(t.category)?t.category:(type==="income"?"otros-ingresos":"otros");
      totals.set(id,(totals.get(id)||0)+t.amount);
      total+=t.amount;
    }
    return {
      total,
      items:[...totals].map(([id,amount])=>({
        id,amount,
        cat:labels.get(id) || {name:"Otros",emoji:"•",color:"#7d8e9e",type},
        fraction:total?amount/total:0
      })).sort((a,b)=>b.amount-a.amount || a.id.localeCompare(b.id))
    };
  }

  /* Solo se cuenta el importe del movimiento; el desglose sirve para repartirlo.
     Si el subtotal del ticket supera el total por descuentos, se prorratea
     para que no se contabilice más dinero del realmente gastado. */
  function summarizeNeeds(transactions, keys) {
    const selected = new Set(keys);
    const empty = month=>({month,necessary:0,optional:0,pending:0,unitemized:0,expenses:0,receipts:0,items:0,adjusted:0});
    const map=new Map(keys.map(k=>[k,empty(k)]));
    for (const tx of transactions) {
      if (!tx||tx.type!=="expense"||!Number.isSafeInteger(tx.amount)||tx.amount<=0)continue;
      const month=String(tx.date||"").slice(0,7);
      if(!selected.has(month))continue;
      const row=map.get(month);
      row.expenses+=tx.amount;
      const items=Array.isArray(tx.receiptItems)?tx.receiptItems.filter(x=>x&&Number.isSafeInteger(x.amount)&&x.amount>0):[];
      if(!items.length){row.unitemized+=tx.amount;continue;}
      row.receipts++;
      row.items+=items.length;
      const gross=items.reduce((a,x)=>a+x.amount,0);
      let portions;
      if (gross>tx.amount) {
        row.adjusted++;
        // Reparto proporcional usando restos mayores: los céntimos suman exactamente el total.
        const parts=items.map((x,i)=>({i,raw:x.amount*tx.amount/gross}));
        portions=parts.map(x=>Math.floor(x.raw));
        let remain=tx.amount-portions.reduce((a,b)=>a+b,0);
        for(const p of parts.slice().sort((a,b)=>(b.raw-Math.floor(b.raw))-(a.raw-Math.floor(a.raw))||a.i-b.i)){
          if(remain--<=0)break;
          portions[p.i]++;
        }
      } else {
        portions=items.map(x=>x.amount);
        row.unitemized+=tx.amount-gross;
      }
      items.forEach((item,i)=>{
        const category=item.necessity==="necessary"?"necessary":item.necessity==="optional"?"optional":"pending";
        row[category]+=portions[i];
      });
    }
    const months=keys.map(k=>map.get(k));
    const total=empty("total");
    for(const m of months){
      for(const k of ["necessary","optional","pending","unitemized","expenses","receipts","items","adjusted"])total[k]+=m[k];
    }
    return {months,total};
  }


  /** Simulador: NO supone ahorro real. Solo utiliza productos marcados "No necesario".
      Se aplica el mismo reparto proporcional de descuentos que en summarizeNeeds. */
  function analyzeSavings(transactions, keys, categories, reductionPercent=25) {
    const selected = new Set(keys);
    const pct = Number.isFinite(reductionPercent)?Math.max(0,Math.min(100,Math.round(reductionPercent))):25;
    const names = new Map();
    const groups = new Map();
    const categoryNames = new Map((categories||[]).filter(c=>c.type==="expense").map(c=>[c.id,c.name]));
    for(const tx of transactions||[]){
      if(!tx||tx.type!=="expense"||!Number.isSafeInteger(tx.amount)||tx.amount<=0||
          !selected.has(String(tx.date||"").slice(0,7))||!Array.isArray(tx.receiptItems))continue;
      const items=tx.receiptItems.filter(x=>x&&Number.isSafeInteger(x.amount)&&x.amount>0);
      if(!items.length)continue;
      const gross=items.reduce((n,item)=>n+item.amount,0);
      if(!gross)continue;
      let values;
      if(gross>tx.amount){
        const parts=items.map((item,i)=>({i,raw:item.amount*tx.amount/gross}));
        values=parts.map(p=>Math.floor(p.raw));
        let left=tx.amount-values.reduce((a,b)=>a+b,0);
        for(const p of parts.slice().sort((a,b)=>(b.raw-Math.floor(b.raw))-(a.raw-Math.floor(a.raw))||a.i-b.i)){
          if(left--<=0)break;
          values[p.i]++;
        }
      }else values=items.map(x=>x.amount);
      items.forEach((item,i)=>{
        if(item.necessity!=="optional"||!values[i])return;
        const name=String(item.name||"Producto sin nombre").trim().slice(0,90)||"Producto sin nombre";
        const id=name.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ");
        const prev=names.get(id)||{name,amount:0,count:0};
        prev.amount+=values[i];prev.count++;names.set(id,prev);
        const cat=categoryNames.get(tx.category)||"Otros gastos";
        groups.set(cat,(groups.get(cat)||0)+values[i]);
      });
    }
    const optional=summarizeNeeds(transactions,keys).total.optional;
    const reduction=Math.round(optional*pct/100);
    return {
      percent:pct,
      optional,
      reduction,
      averageMonthly:Math.round(reduction/Math.max(1,keys.length)),
      annualProjection:Math.round((optional*pct/100)*12/Math.max(1,keys.length)),
      products:[...names.values()].sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name,"es")).slice(0,8),
      categories:[...groups].map(([name,amount])=>({name,amount})).sort((a,b)=>b.amount-a.amount||a.name.localeCompare(b.name,"es")).slice(0,8)
    };
  }

  function build(context) {
    const {getData, CAT, money, h, localDate, render} = context;
    let period=6;
    let kind="expense";
    let savingCut=25;
    const fmtMonth = new Intl.DateTimeFormat("es-ES",{month:"short",year:"2-digit"});
    const monthName = key => {
      const [y,m]=key.split("-").map(Number);
      return fmtMonth.format(new Date(y,m-1,15,12)).replace(".","");
    };
    const view = () => {
      const keys=monthsFor(period,localDate());
      const tx=getData().transactions;
      const series=aggregate(tx,keys);
      const sum=(type)=>series.reduce((acc,m)=>acc+m[type],0);
      const income=sum("income"),expense=sum("expense"),net=income-expense;
      const savings = income ? Math.round((net/income)*100) : null;
      const avgExpense=Math.round(expense/period);
      const max=Math.max(1,...series.flatMap(s=>[s.expense,s.income]));
      const catData=categoriesFor(tx,keys,kind,CAT);
      const topMonth=series.filter(s=>s.expense>0).sort((a,b)=>b.expense-a.expense)[0];

      const needs=summarizeNeeds(tx,keys);
      const savingsPlan=analyzeSavings(tx,keys,CAT,savingCut);
      const nt=needs.total;
      const known=nt.necessary+nt.optional;
      const ratioOfKnown=known?Math.round(nt.optional/known*100):null;
      const ratioOfAll=nt.expenses?Math.round(nt.optional/nt.expenses*100):null;
      const classifications=[
        ["necessary","Necesarios","#0fa38a"],
        ["optional","No necesarios","#ed6f69"],
        ["pending","Sin clasificar","#e3ac45"],
        ["unitemized","Sin desglose","#9ba7b2"]
      ];
      const needsCards=classifications.map(([key,title,color])=>
        '<div class="needs-kpi"><span class="needs-dot" style="background:'+color+'"></span><small>'+title+'</small><strong>'+h(money(nt[key]))+'</strong></div>'
      ).join("");
      const needsBars=needs.months.map(m=>{
        const content=m.expenses?classifications.map(([key,title,color])=>{
          const pct=m[key]/m.expenses*100;
          return pct>0?'<span class="needs-segment" style="width:'+pct+'%;background:'+color+'" title="'+h(title+': '+money(m[key]))+'"></span>':'';
        }).join(""):'<span class="needs-emptybar"></span>';
        return '<div class="needs-month-row"><span class="needs-month-label">'+h(monthName(m.month))+'</span><div class="needs-stacked" role="img" aria-label="'+h(monthName(m.month)+': '+money(m.necessary)+' necesarios, '+money(m.optional)+' no necesarios, '+money(m.pending)+' sin clasificar y '+money(m.unitemized)+' sin desglose')+'">'+content+'</div><strong>'+h(money(m.expenses))+'</strong></div>';
      }).join("");
      const needsTable=needs.months.slice().reverse().map(m=>
        '<tr><th scope="row">'+h(monthName(m.month))+'</th><td>'+h(money(m.necessary))+'</td><td>'+h(money(m.optional))+'</td><td>'+h(money(m.pending+m.unitemized))+'</td></tr>'
      ).join("");

      const savingChoices=[10,25,50,75,100];
      const planOptions=savingChoices.map(n=>'<button type="button" data-savings-cut="'+n+'" class="stats-filter'+(savingCut===n?' selected':'')+'" aria-pressed="'+(savingCut===n)+'">'+n+' %</button>').join("");
      const planProducts=savingsPlan.products.map((p,i)=>
        '<div class="saving-leaderboard-row"><span class="saving-position">'+(i+1)+'</span><div><strong>'+h(p.name)+'</strong><small>'+p.count+' '+(p.count===1?'compra':'compras')+'</small></div><b>'+h(money(p.amount))+'</b></div>'
      ).join("");
      const planCats=savingsPlan.categories.map((cat,i)=>
        '<div class="saving-leaderboard-row"><span class="saving-position">'+(i+1)+'</span><div><strong>'+h(cat.name)+'</strong></div><b>'+h(money(cat.amount))+'</b></div>'
      ).join("");
      const chart=series.map(s=>{
        const heightInc=Math.max(s.income?3:0, Math.round(s.income/max*100));
        const heightExp=Math.max(s.expense?3:0, Math.round(s.expense/max*100));
        const aria=h(monthName(s.month)+": "+money(s.income)+" de ingresos, "+money(s.expense)+" de gastos");
        return '<div class="stats-chart-col" title="'+aria+'" aria-label="'+aria+'"><div class="stats-bars"><span class="stats-bar income" style="height:'+heightInc+'%" aria-hidden="true"></span><span class="stats-bar expense" style="height:'+heightExp+'%" aria-hidden="true"></span></div><span class="stats-chart-label">'+h(monthName(s.month))+'</span></div>';
      }).join("");
      const cats=catData.items.map(row=>{
        const percent=Math.round(row.fraction*100);
        return '<div class="stats-cat-row"><div class="stats-cat-main"><span class="stats-cat-icon" aria-hidden="true">'+h(row.cat.emoji)+'</span><span class="stats-cat-name">'+h(row.cat.name)+'</span><strong>'+h(money(row.amount))+'</strong></div><div class="stats-cat-track" role="progressbar" aria-valuenow="'+percent+'" aria-valuemin="0" aria-valuemax="100" aria-label="'+h(row.cat.name)+', '+percent+' %"><span style="width:'+row.fraction*100+'%;background:'+h(row.cat.color)+'"></span></div><small>'+percent+' % del total</small></div>';
      }).join("");
      const table=series.slice().reverse().map(s=>'<tr><th scope="row">'+h(monthName(s.month))+'</th><td>'+h(money(s.income))+'</td><td>'+h(money(s.expense))+'</td><td class="'+(s.income>=s.expense?"stats-pos":"stats-neg")+'">'+h(money(s.income-s.expense))+'</td></tr>').join("");
      return '<div class="view-heading stats-heading"><div><div class="eyebrow">TU EVOLUCIÓN</div><h1 class="page-title">Estadísticas</h1></div><span class="tag">V3</span></div>'
        +'<div class="stats-toolbar" role="group" aria-label="Periodo del análisis">'+[3,6,12].map(n=>'<button type="button" class="stats-filter'+(period===n?' selected':'')+'" data-stats-period="'+n+'" aria-pressed="'+(period===n)+'">'+n+' meses</button>').join("")+'</div>'
        +'<section class="stats-kpis" aria-label="Resumen financiero del periodo">'
        +'<div class="stats-kpi"><small>Ingresos</small><strong class="stats-pos">'+h(money(income))+'</strong></div>'
        +'<div class="stats-kpi"><small>Gastos</small><strong>'+h(money(expense))+'</strong></div>'
        +'<div class="stats-kpi"><small>Balance</small><strong class="'+(net>=0?"stats-pos":"stats-neg")+'">'+h(money(net))+'</strong></div>'
        +'<div class="stats-kpi"><small>Ahorro sobre ingresos</small><strong>'+ (savings===null?'—':savings+' %') +'</strong></div>'
        +'</section>'
        +'<section class="card stats-panel"><div class="section-heading"><h2>Ingresos y gastos</h2></div>'
        +'<div class="stats-legend"><span class="stats-key income"></span>Ingresos <span class="stats-key expense"></span>Gastos</div>'
        +'<div class="stats-chart" role="group" aria-label="Evolución mensual de ingresos y gastos">'+chart+'</div>'
        +'<div class="stats-subinfo"><span>Gasto medio: <b>'+h(money(avgExpense))+' / mes</b></span><span>'+(topMonth?'Mayor gasto: <b>'+h(monthName(topMonth.month))+'</b>':'Sin gastos registrados')+'</span></div></section>'
        +'<section class="card stats-panel"><div class="section-heading"><h2>Desglose por categorías</h2></div>'
        +'<div class="stats-toolbar stats-toolbar-small" role="group" aria-label="Tipo de desglose">'
        +'<button type="button" data-stats-kind="expense" aria-pressed="'+(kind==="expense")+'" class="stats-filter'+(kind==="expense"?' selected':'')+'">Gastos</button>'
        +'<button type="button" data-stats-kind="income" aria-pressed="'+(kind==="income")+'" class="stats-filter'+(kind==="income"?' selected':'')+'">Ingresos</button></div>'
        +(cats || '<p class="muted stats-empty">No hay '+(kind==="expense"?'gastos':'ingresos')+' en este periodo.</p>')
        +'</section>'

        +'<section class="card stats-panel needs-panel"><div class="section-heading"><h2>🧾 Necesarios y no necesarios</h2></div>'
        +'<p class="muted">Clasificación de productos en tickets. Los importes proceden del gasto original, sin duplicarlos.</p>'
        +'<div class="needs-kpis">'+needsCards+'</div>'
        +'<div class="needs-insight">'+(ratioOfKnown===null?'Clasifica productos de un ticket para calcular tus compras prescindibles.'
            :'<strong>'+ratioOfKnown+' %</strong> de los productos ya clasificados corresponde a compras no necesarias.')
          + (ratioOfAll===null?'':' <small>Representan el '+ratioOfAll+' % de todos los gastos del periodo.</small>')+'</div>'
        +'<div class="section-heading"><h2>Comparativa mensual</h2></div>'
        +'<div class="needs-stack-list">'+needsBars+'</div>'
        +'<div class="stats-table-scroll"><table class="stats-table needs-table"><thead><tr><th>Mes</th><th>Necesarios</th><th>No necesarios</th><th>Sin evaluar</th></tr></thead><tbody>'+needsTable+'</tbody></table></div>'
        +'<p class="footnote">'+nt.receipts+' tickets con desglose · '+nt.items+' productos. Los importes «sin desglose» incluyen otros gastos y diferencias del ticket. '+(nt.adjusted?'En '+nt.adjusted+' tickets se prorratearon descuentos al superar los productos el importe final.':'')+'</p></section>'

        +'<section class="card stats-panel saving-plan"><div class="section-heading"><h2>💰 Plan de ahorro</h2></div>'
        +'<p class="muted">Simula cuánto podrías ahorrar reduciendo compras que has marcado como «No necesario». El cálculo no modifica tus movimientos.</p>'
        +'<div class="saving-current"><small>Compras prescindibles detectadas en '+period+' meses</small><strong>'+h(money(savingsPlan.optional))+'</strong></div>'
        +'<p class="saving-slider-label">¿Qué porcentaje de esas compras reducirías?</p>'
        +'<div class="saving-choices" role="group" aria-label="Porcentaje de reducción simulado">'+planOptions+'</div>'
        +'<div class="saving-results"><div><small>Ahorro simulado / mes*</small><strong>'+h(money(savingsPlan.averageMonthly))+'</strong></div><div><small>Proyección anual*</small><strong>'+h(money(savingsPlan.annualProjection))+'</strong></div></div>'
        +'<div class="saving-total">Reducción total en este periodo: <b>'+h(money(savingsPlan.reduction))+'</b></div>'
        +'<div class="section-heading"><h2>Productos prescindibles más caros</h2></div>'
        +(planProducts||'<p class="muted">Todavía no has clasificado productos como «No necesario».</p>')
        +'<div class="section-heading saving-secondary-heading"><h2>Categorías con más compras prescindibles</h2></div>'
        +(planCats||'<p class="muted">Esta información aparecerá cuando clasifiques productos de tus tickets.</p>')
        +'<p class="footnote">*Proyección orientativa: promedio de los '+period+' meses seleccionados, incluido el actual, multiplicado por 12. No representa dinero ahorrado realmente ni predice gastos futuros. Los productos pendientes y los gastos sin desglose quedan fuera de esta simulación.</p></section>'
        +'<section class="card stats-panel stats-table-panel"><div class="section-heading"><h2>Detalle por mes</h2></div>'
        +'<div class="stats-table-scroll"><table class="stats-table"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead><tbody>'+table+'</tbody></table></div></section>'
        +'<p class="footnote">Datos de este dispositivo. Las cantidades están expresadas en euros y los periodos incluyen el mes actual. Los promedios incluyen meses sin movimientos.</p>';
    };
    document.addEventListener("click",event=>{
      const button=event.target.closest("[data-stats-period],[data-stats-kind],[data-savings-cut]");
      if (!button) return;
      if(button.hasAttribute("data-savings-cut")){
        const next=Number(button.dataset.savingsCut);
        if(![10,25,50,75,100].includes(next)||next===savingCut)return;
        savingCut=next;render();return;
      }
      if (button.hasAttribute("data-stats-period")) {
        const next=Number(button.dataset.statsPeriod);
        if (![3,6,12].includes(next) || next===period) return;
        period=next;
      } else {
        if (!["income","expense"].includes(button.dataset.statsKind) || button.dataset.statsKind===kind) return;
        kind=button.dataset.statsKind;
      }
      render();
    });
    return {renderPage:view,getPeriod:()=>period,getKind:()=>kind};
  }
  root.CGStats={monthsFor,aggregate,categoriesFor,summarizeNeeds,analyzeSavings,build};
})(window);
