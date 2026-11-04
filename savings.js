/* Budviva V5.5 - Ahorro inteligente. Reutiliza las cuentas de CGStats. */
(function(root){
  "use strict";
  function build(ctx){
    const {getData,CAT,money,h,pictogram,render,getMonth}=ctx;
    let period=1;
    let cut=25;
    function calc(){
      const month=getMonth();
      const keys=root.CGStats.monthsFor(period,month+"-15");
      const transactions=getData().transactions;
      return {
        keys,
        analysis:root.CGStats.analyzeSavings(transactions,keys,CAT,cut),
        needs:root.CGStats.summarizeNeeds(transactions,keys).total,
        transactions
      };
    }
    function periodButtons(){
      return [[1,"Este mes"],[3,"3 meses"],[6,"6 meses"]].map(function(p){
        return '<button type="button" class="saving-period'+(period===p[0]?' selected':'')+
          '" data-saving-period="'+p[0]+'" aria-pressed="'+(period===p[0])+'">'+p[1]+'</button>';
      }).join("");
    }
    function cutButtons(){
      return [10,25,50,75,100].map(function(n){
        return '<button type="button" class="saving-choice'+(cut===n?' selected':'')+
          '" data-saving-cut="'+n+'" aria-pressed="'+(cut===n)+'">'+n+' %</button>';
      }).join("");
    }
    function placeholder(icon,title,description,buttonLabel,buttonAction){
      return '<div class="saving-placeholder">'+pictogram(icon,26)+'<strong>'+h(title)+'</strong><p>'+
        h(description)+'</p><button type="button" class="small-action" data-action="'+h(buttonAction)+'">'+h(buttonLabel)+'</button></div>';
    }
    function renderPage(){
      const obj=calc(),a=obj.analysis,n=obj.needs;
      const heading='<div class="view-heading"><div><div class="eyebrow">TU DINERO, MÁS CLARO</div><h1 class="page-title">Ahorro inteligente</h1></div><span class="tag">Análisis de tickets</span></div>';
      const products=a.products.map(function(p,i){
        return '<div class="saving-rank-row"><span class="saving-rank-num">'+(i+1)+'</span><div class="saving-rank-info"><strong>'+h(p.name)+
          '</strong><small>'+p.count+' '+(p.count===1?'compra':'compras')+'</small></div><b>'+h(money(p.amount))+'</b></div>';
      }).join("");
      const cats=a.categories.map(function(c){
        return '<div class="saving-category-row"><span>'+h(c.name)+'</span><strong>'+h(money(c.amount))+'</strong></div>';
      }).join("");
      const receipts=obj.transactions.filter(function(t){
        return t.type==='expense'&&obj.keys.includes(String(t.date||'').slice(0,7))&&Array.isArray(t.receiptItems)&&t.receiptItems.length>0;
      }).sort(function(a,b){return b.date.localeCompare(a.date)||b.id.localeCompare(a.id)}).slice(0,20);
      const receiptRows=receipts.map(function(t){
        const pending=t.receiptItems.filter(function(p){return p.necessity!=='necessary'&&p.necessity!=='optional'}).length;
        return '<button type="button" class="saving-receipt-row" data-open-receipt="'+h(t.id)+'">'+
          '<span class="saving-receipt-icon">'+pictogram('receipt',19)+'</span><span class="saving-receipt-meta"><b>'+h(t.title)+'</b><small>'+
          h(t.date)+' · '+t.receiptItems.length+' productos'+(pending?' · '+pending+' pendientes':'')+'</small></span>'+
          '<strong>'+h(money(t.amount))+'</strong><span class="saving-receipt-chevron">›</span></button>';
      }).join("");
      const savingsKpis=[["necessary","Necesarios"],["optional","Prescindibles"],["pending","Sin clasificar"],["unitemized","Sin desglose"]].map(function(row){
        return '<div class="saving-kpi saving-kpi-'+row[0]+'"><span>'+row[1]+'</span><strong>'+h(money(n[row[0]]))+'</strong></div>';
      }).join("");
      return heading+
        '<div class="saving-periods" role="group" aria-label="Periodo de análisis">'+periodButtons()+'</div>'+
        '<section class="saving-hero"><div class="saving-hero-label">'+pictogram('target',19)+' Ahorro potencial al mes</div>'+
        '<div class="saving-hero-value">'+h(money(a.averageMonthly))+'</div>'+
        '<div class="saving-hero-caption">Simulación reduciendo el '+cut+' % de las compras marcadas como «No necesario».</div>'+
        '<div class="saving-hero-divider"></div><div class="saving-hero-foot"><span>Proyección anual orientativa</span><strong>'+h(money(a.annualProjection))+'</strong></div></section>'+
        '<section class="card saving-simulator"><h2>Tu plan de reducción</h2><p class="muted">¿Qué porcentaje de compras prescindibles puedes evitar?</p>'+
        '<div class="saving-choices-v2" role="group" aria-label="Porcentaje simulado">'+cutButtons()+'</div>'+
        '<p class="saving-explanation">Has identificado '+h(money(a.optional))+' en compras prescindibles durante el periodo. Reducir un '+cut+
        ' % equivaldría a '+h(money(a.reduction))+' en el periodo seleccionado.</p></section>'+
        '<div class="saving-kpis">'+savingsKpis+'</div>'+
        '<div class="section-heading"><h2>Productos prescindibles</h2></div><section class="card saving-list">'+
        (products||placeholder('target','Sin productos prescindibles','Importa un ticket y marca sus productos como «No necesario» para obtener propuestas de ahorro.','Importar ticket','smart-import'))+'</section>'+
        (cats?'<div class="section-heading"><h2>Categorías con margen</h2></div><section class="card saving-list">'+cats+'</section>':'')+
        '<div class="section-heading"><h2>Revisar tus tickets</h2></div><section class="card saving-receipts">'+
        (receiptRows||placeholder('receipt','Todavía no hay tickets','Los movimientos sin desglose no se consideran gastos prescindibles.','Importar ticket','smart-import'))+'</section>'+
        '<p class="footnote">Estas cifras son estimaciones, no ahorro conseguido. Solo cuentan los productos que marques como «No necesario». Los productos pendientes y los gastos sin desglose no se consideran ahorrables. Los descuentos se prorratean si el subtotal supera el importe final del ticket. La proyección anual supone que mantienes la misma media mensual.</p>';
    }
    function renderPreview(month){
      const report=root.CGStats.analyzeSavings(getData().transactions,[month],CAT,25);
      return '<div class="section-heading"><h2>Ahorro inteligente</h2><button type="button" class="text-link" data-action="savings">Ver análisis →</button></div>'+
        '<section class="card saving-preview"><span class="saving-preview-icon">'+pictogram('target',24)+'</span>'+
        '<div><b>'+h(money(report.reduction))+'</b><small>Potencial de ahorro este mes si reduces un 25 % de tus compras prescindibles.</small></div>'+
        '<button type="button" class="small-action" data-action="savings">Ver plan</button></section>';
    }
    document.addEventListener('click',function(event){
      const button=event.target.closest('[data-saving-period],[data-saving-cut]');
      if(!button)return;
      if(button.hasAttribute('data-saving-period')){
        const n=Number(button.dataset.savingPeriod);
        if(![1,3,6].includes(n)||n===period)return;
        period=n;
      }else{
        const n=Number(button.dataset.savingCut);
        if(![10,25,50,75,100].includes(n)||n===cut)return;
        cut=n;
      }
      render();
    });
    return {renderPage,renderPreview,getState:function(){return {period,cut}}};
  }
  root.BudvivaSavings={build};
})(window);
