/* Control de Gastos V4 — alertas de presupuesto en la aplicación.
   No solicita permisos ni envía notificaciones push: se recalcula al abrir cada pantalla. */
(function (root) {
  "use strict";
  const allowedThresholds = [70,80,90];
  const defaults = () => ({enabled:true,warningAt:80});
  function normalizeConfig(value) {
    return {
      enabled: !(value && value.enabled === false),
      warningAt: value && allowedThresholds.includes(value.warningAt) ? value.warningAt : 80
    };
  }
  function compute(data, monthKey, categories) {
    const config = normalizeConfig(data?.budgetAlerts);
    const budgets = data?.budgets || {};
    const transactions = Array.isArray(data?.transactions) ? data.transactions : [];
    const validCategory = new Map(categories.filter(c=>c.type==="expense").map(c=>[c.id,c]));
    const spent = new Map();
    for (const item of transactions) {
      if (!item || item.type!=="expense" || String(item.date||"").slice(0,7)!==monthKey) continue;
      if (!validCategory.has(item.category) || !Number.isSafeInteger(item.amount) || item.amount<=0) continue;
      spent.set(item.category,(spent.get(item.category)||0)+item.amount);
    }
    const rows=[];
    for (const [id, limit] of Object.entries(budgets)) {
      if (!validCategory.has(id) || !Number.isSafeInteger(limit) || limit<=0) continue;
      const used=spent.get(id)||0;
      const ratio=used/limit;
      const level=ratio>=1?"exceeded":ratio>=config.warningAt/100?"warning":"ok";
      rows.push({id,cat:validCategory.get(id),limit,used,ratio,remaining:limit-used,level});
    }
    rows.sort((a,b)=>b.ratio-a.ratio || a.cat.name.localeCompare(b.cat.name,"es"));
    return {
      config,rows,
      exceeded:rows.filter(r=>r.level==="exceeded"),
      warning:rows.filter(r=>r.level==="warning"),
      alerts:config.enabled ? rows.filter(r=>r.level!=="ok") : []
    };
  }
  function build(ctx) {
    const {getData,save,render,CAT,h,money,toast}=ctx;
    const label=month=>{const [y,m]=month.split("-").map(Number);return new Intl.DateTimeFormat("es-ES",{month:"long",year:"numeric"}).format(new Date(y,m-1,15,12));};
    const summary=month=>compute(getData(),month,CAT);
    const homeBanner = month => {
      const info=summary(month);
      if (!info.config.enabled || !info.alerts.length) return "";
      const exceeded=info.alerts.filter(x=>x.level==="exceeded").length;
      const title=exceeded
        ? "Has superado "+(exceeded===1?"un presupuesto":exceeded+" presupuestos")
        : (info.alerts.length===1?"Un presupuesto cerca del límite":info.alerts.length+" presupuestos cerca del límite");
      const details=info.alerts.slice(0,2).map(a=>h(a.cat.name)+" ("+Math.round(a.ratio*100)+" %)").join(" · ");
      return '<section class="budget-alert-banner '+(exceeded?"is-critical":"")+'" role="status" aria-label="Avisos de presupuesto"><span aria-hidden="true">'+(exceeded?"⛔":"⚠️")+'</span><div><strong>'+h(title)+'</strong><p>'+details+'</p></div><button type="button" class="budget-alert-link" data-action="budgets" aria-label="Ver presupuestos">Ver</button></section>';
    };
    const panel=month=>{
      const info=summary(month);
      const count=info.alerts.length;
      const n=info.rows.length;
      const rows=info.alerts.map(r=>{
        const pct=Math.round(r.ratio*100);
        const msg=r.level==="exceeded"?"Exceso de "+money(-r.remaining):"Quedan "+money(r.remaining);
        return '<div class="budget-alert-item"><span class="budget-alert-icon" aria-hidden="true">'+h(r.cat.emoji)+'</span><div class="budget-alert-copy"><strong>'+h(r.cat.name)+' · '+pct+' %</strong><small>'+h(msg)+' de '+h(money(r.limit))+' presupuestados</small></div><span class="budget-alert-pill '+(r.level==="exceeded"?"danger":"warn")+'">'+(r.level==="exceeded"?"Superado":"Aviso")+'</span></div>';
      }).join("");
      const state=!n
        ?'<p class="budget-alert-empty">Configura un límite mensual para empezar a recibir avisos.</p>'
        :!info.config.enabled
        ?'<p class="budget-alert-empty">Los avisos están desactivados. Tus presupuestos siguen funcionando.</p>'
        :!count
        ?'<p class="budget-alert-empty">✅ No hay límites alcanzados durante '+h(label(month))+'.</p>'
        :rows;
      return '<section class="card budget-alert-panel"><div class="section-heading"><h2>🔔 Avisos de presupuesto</h2></div>'
      +'<p class="budget-alert-caption">Seguimiento de '+h(label(month))+'. Los avisos aparecen dentro de esta aplicación.</p>'
      +'<div class="budget-alert-controls"><label class="budget-alert-toggle"><input type="checkbox" data-budget-alert-enabled '+(info.config.enabled?"checked":"")+'><span>Activar avisos</span></label>'
      +'<label class="budget-alert-threshold">Avisar al <select aria-label="Porcentaje de aviso" data-budget-alert-threshold '+(!info.config.enabled?'disabled':'')+'>'+allowedThresholds.map(n=>'<option value="'+n+'" '+(n===info.config.warningAt?"selected":"")+'>'+n+' %</option>').join("")+'</select></label></div>'
      +'<div class="budget-alert-content" aria-live="polite">'+state+'</div>'
      +'</section>';
    };
    document.addEventListener("change", e=>{
      const enabled=e.target.closest("[data-budget-alert-enabled]");
      const threshold=e.target.closest("[data-budget-alert-threshold]");
      if (!enabled && !threshold) return;
      const data=getData();
      const old=data.budgetAlerts?{...data.budgetAlerts}:defaults();
      const next=normalizeConfig(data.budgetAlerts);
      if (enabled) next.enabled=enabled.checked;
      if (threshold) {
        const value=Number(threshold.value);
        if (!allowedThresholds.includes(value)) return;
        next.warningAt=value;
      }
      data.budgetAlerts=next;
      if (!save()) {data.budgetAlerts=old;render();return;}
      render();
      toast("Avisos de presupuesto actualizados");
    });
    return {summary,renderHome:homeBanner,renderPanel:panel};
  }
  root.CGBudgetAlerts={defaults,normalizeConfig,compute,build};
})(window);
