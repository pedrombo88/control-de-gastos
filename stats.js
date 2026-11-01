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
  function build(context) {
    const {getData, CAT, money, h, localDate, render} = context;
    let period=6;
    let kind="expense";
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
        +'<section class="card stats-panel stats-table-panel"><div class="section-heading"><h2>Detalle por mes</h2></div>'
        +'<div class="stats-table-scroll"><table class="stats-table"><thead><tr><th>Mes</th><th>Ingresos</th><th>Gastos</th><th>Balance</th></tr></thead><tbody>'+table+'</tbody></table></div></section>'
        +'<p class="footnote">Datos de este dispositivo. Las cantidades están expresadas en euros y los periodos incluyen el mes actual. Los promedios incluyen meses sin movimientos.</p>';
    };
    document.addEventListener("click",event=>{
      const button=event.target.closest("[data-stats-period],[data-stats-kind]");
      if (!button) return;
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
  root.CGStats={monthsFor,aggregate,categoriesFor,build};
})(window);
