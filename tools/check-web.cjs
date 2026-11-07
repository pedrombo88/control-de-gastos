/* Check de liberación sin dependencias externas. */
const fs=require("node:fs"),vm=require("node:vm"),assert=require("node:assert/strict");
const files=["recurring.js","stats.js","reconcile.js","smart-import.js","documents.js","backup-crypto.js","sw.js","shared-expenses.js","compartidos.js","shared-config.js"];
for(const f of files) new vm.Script(fs.readFileSync(f,"utf8"),{filename:f});
const html=fs.readFileSync("index.html","utf8");

// Branding: Apple icon must match the header's B + mint dot identity.
const brandSvg=fs.readFileSync('icon.svg','utf8');
const appleIcon=fs.readFileSync('apple-touch-icon.png');
assert(html.includes('class="brand-mark"')&&html.includes('brand-mark-dot'),'In-app logo missing');
const releaseVersion=JSON.parse(fs.readFileSync('package.json','utf8')).version;
assert(html.includes("const APP_VERSION = '"+releaseVersion+"'"),'Refresh version must follow release version');
const refreshPart=html.split('const refreshBudviva = async () => {')[1]?.split('const handleAction = action => {')[0];
assert(refreshPart&&refreshPart.includes("next.searchParams.set('v',APP_VERSION)"),'PWA refresh must use current release');
assert(!refreshPart.includes('caches.delete('),'Manual refresh must preserve offline caches');
assert(refreshPart.includes('navigator.onLine===false'),'Offline refresh must be non-destructive');
assert(html.includes('current!==lastPersistedRaw')&&html.includes('lastPersistedRaw=serialized'),'Prevent overwriting data from another tab');
assert(html.includes('dataLoadCorrupt?settingsRow(')&&html.includes("'export-emergency'"),'Corrupt local storage should offer an emergency export');
assert(html.includes('Los datos cambiaron en otra pestaña. Actualiza Budviva antes de restaurar'),'Backup restore must check for concurrent edits before touching original files');


assert(html.includes('href="./apple-touch-icon.png?v='+releaseVersion+'"'),'iPhone must load the unified icon for the current release');
assert(brandSvg.includes('>B</text>')&&brandSvg.includes('#6cebd0'),'Favicon must match in-app B and mint dot');
assert.equal(appleIcon.subarray(0,8).toString('hex'),'89504e470d0a1a0a','Apple icon must be PNG');
assert.equal(appleIcon.readUInt32BE(16),180,'Apple icon must be 180px wide');
assert.equal(appleIcon.readUInt32BE(20),180,'Apple icon must be 180px tall');

const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(Boolean);
for(const [i,src] of inline.entries())new vm.Script(src,{filename:"index.html:inline:"+i});
const nav=[...html.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0].matchAll(/data-tab="([^"]+)"/g)||[]].map(x=>x[1]);
assert.deepEqual(nav,["home","transactions","budgets","savings","settings"]);
assert(html.includes('data-action="shared-household"'));
assert(html.includes("window.location.href='./compartidos.html'"));
const sharedJsSource=fs.readFileSync('compartidos.js','utf8');
const sharedJs=sharedJsSource;
const csvFnSource=sharedJsSource.match(/function csvCell\(value\)\{[\s\S]*?\n\}/)?.[0];
assert(csvFnSource,'CSV sanitization missing');
const csvFn=new Function(csvFnSource+';return csvCell;')();
for(const unsafe of ['=2+2','  =SUM(A1)','\t@evil','+2','-2']) assert(csvFn(unsafe).charAt(1)==="'",'CSV formula escaped');
assert.equal(csvFn('compra'),'"compra"');
assert(sharedJsSource.includes('expenses=[];settlements=[];closureApprovals=[];currentTransfer=null;lastLoadedGeneration=0;'),'Clear data when household disappears');
const sharedHtml=fs.readFileSync('compartidos.html','utf8');
assert(sharedHtml.includes('http-equiv="Content-Security-Policy"'),'Compartidos must define a CSP');
assert(sharedHtml.includes("script-src 'self'"),'Compartidos must not allow arbitrary inline scripts');
assert(sharedHtml.includes('connect-src')&&sharedHtml.includes('https://bsvtttcuqamjifnpuzlj.supabase.co'),'Compartidos CSP must allow only its backend');

const privacyHtml=fs.readFileSync('privacidad.html','utf8');
const supportHtml=fs.readFileSync('soporte.html','utf8');
const supportContactSource=fs.readFileSync('support-contact.js','utf8');
new vm.Script(supportContactSource,{filename:'support-contact.js'});
assert(supportHtml.includes('id="private-support-link"')&&supportHtml.includes('src="./support-contact.js"'),'El enlace de soporte debe estar preparado');
assert(supportContactSource.includes('const verified=true;')&&supportContactSource.includes("const address='soporte@budviva.com';"),'Publicar solo el alias que el titular ha verificado');
assert(supportContactSource.includes('@budviva\\.com'),'Los contactos deben usar solo el dominio verificado');
const privacyChoicesHtml=fs.readFileSync('datos-y-privacidad.html','utf8');
assert(html.includes('href="./datos-y-privacidad.html"'),'Ajustes debe enlazar al control de datos');
assert(privacyChoicesHtml.includes('href="./compartidos.html"')&&privacyChoicesHtml.includes('href="./index.html"'),'La página de privacidad debe permitir acceder al borrado de ambos tipos de datos');
assert(privacyChoicesHtml.includes('antes de la distribución comercial'),'La versión beta debe indicar las condiciones pendientes');
assert(privacyHtml.includes('Resend'),'La política debe indicar el proveedor real de correo');
assert(!supportHtml.includes('el envío real y la eliminación con cuentas desechables siguen pendientes'),'Soporte no debe afirmar que la baja OTP está sin probar');
assert(!privacyHtml.includes('aún no son autoservicio'),'Privacy policy must not contradict account deletion');
assert(privacyHtml.includes('eliminación definitiva de tu cuenta de acceso'),'Privacy policy must explain deletion');
assert(privacyHtml.includes('no borra los registros personales guardados localmente'),'Local data limitation must be disclosed');
assert(supportHtml.includes('Comprobar protección de mi cuenta'),'Support must document safe account check');
assert(supportHtml.includes('código de un solo uso enviado a tu correo'),'Support must explain OTP deletion');
assert(privacyHtml.includes('código de un solo uso enviado al correo'),'Privacy must explain OTP deletion');

for(const [page,source] of [['Compartidos',sharedHtml],['Privacidad',privacyHtml],['Soporte',supportHtml],['Datos',privacyChoicesHtml]]){
  assert(source.includes('href="./icon.svg?v='+releaseVersion+'"'),page+' must use the current Budviva logo');
}


assert(sharedHtml.includes('id="delete-account-otp-form"')&&sharedHtml.includes('id="send-deletion-otp"'),'Passwordless deletion controls missing');
assert(sharedJs.includes("email:user.email,create_user:false"),'OTP must not create users');
assert(sharedHtml.includes('id="expense-form"')&&sharedHtml.includes('id="settlement-form"'));
assert(fs.readFileSync('shared-config.js','utf8').includes('publishableKey'));
assert(fs.readFileSync('backend/compartidos.sql','utf8').includes('enable row level security'));
assert(sharedHtml.includes('id="password-form"'),"Password fallback form missing");
assert(sharedHtml.includes('id="summary-period"'),"Monthly comparison control missing");
assert(sharedHtml.includes('id="last-sync"'),"Last synced marker missing");
assert(sharedHtml.includes('id="settle-exact"'),"Exact settlement control missing");
assert(sharedHtml.includes('id="profile-form"'),"Shared profile editor missing");
assert(sharedHtml.includes('id="share-comparison"'),"Individual balance missing");
assert(sharedHtml.includes('id="activity-list"'),"Shared activity feed missing");
assert(sharedHtml.includes('id="export-shared-json"')&&sharedHtml.includes('id="export-shared-csv"'),"Shared export actions missing");
assert(sharedHtml.includes('id="closure-approve"')&&sharedHtml.includes('id="closure-cancel"'),"Mutual closure controls missing");
assert(sharedHtml.includes('id="leave-empty"')&&sharedHtml.includes('id="household-management"'),"Safe household leave controls missing");
assert(sharedHtml.includes('Eliminar mi cuenta de acceso'),"Account deletion guidance missing");
assert(sharedHtml.includes('Privacidad y baja de cuenta'),"Privacy information must be visible before joining a household");

assert(sharedHtml.includes('id="delete-account-form"'),"Account deletion form missing");
assert(sharedJs.includes("'/functions/v1/bv-delete-account'"),"Account deletion endpoint missing");
assert(sharedJs.includes("confirmation!=='ELIMINAR CUENTA'"),"Typed confirmation missing");
const deleteEdge=fs.readFileSync('backend/functions/bv-delete-account/index.ts','utf8');
assert(deleteEdge.includes('Access-Control-Allow-Origin')&&deleteEdge.includes('OPTIONS'),"Deletion CORS preflight missing");
assert(deleteEdge.includes('signInWithPassword')&&deleteEdge.includes('auth.admin.deleteUser'),"Reauthentication or deletion missing");
assert(deleteEdge.includes('bv_members')&&deleteEdge.includes('bv_expenses'),"Shared ledger guard missing");
assert(!sharedJs.includes('SUPABASE_SERVICE_ROLE_KEY'),"Server secret must not appear in browser");

assert(sharedJs.includes('bv_leave_empty_household'),"Safe household leave RPC missing");
assert(fs.readFileSync('backend/compartidos.sql','utf8').includes("if exists(select 1 from public.bv_expenses"),"Safe leave ledger guard missing");
assert(sharedJs.includes("bv_manage_household_closure"),"Mutual closure RPC missing");
assert(fs.readFileSync('backend/compartidos.sql','utf8').includes("v_approvals=v_count"),"Mutual approval rule missing");
assert(sharedJs.includes('function sharedExportData()'),"Shared export payload missing");
assert(sharedJs.includes('lastLoadedGeneration!==loadGeneration'),"Shared export must require fresh data");
assert(sharedJs.includes('function renderActivity()'),"Shared activity logic missing");
assert(sharedJs.includes("result.shareCents[m.user_id]"),"Per-person share not displayed");
assert(sharedJs.includes("x.reviewed_at||x.created_at"),"Settlement review date not displayed");
assert(sharedJs.includes("readAllRows('bv_expenses'"),"Expense history may be silently truncated");
assert(sharedJs.includes("readAllRows('bv_settlements'"),"Settlement history may be silently truncated");
assert(sharedJs.includes("x.status==='confirmed'"),"Unconfirmed settlements must not reduce debts");
assert(sharedJs.includes("setInterval(()=>{if(!document.hidden&&session&&household)"),"Shared balances must refresh");
const sharedSql=fs.readFileSync('backend/compartidos.sql','utf8');
assert(sharedSql.includes('and (select count(*) from public.bv_members m where m.household_id=bv_expenses.household_id)=2'),"Only complete households may add shared expenses");
assert(sharedSql.includes('and (select count(*) from public.bv_members m where m.household_id=bv_settlements.household_id)=2'),"Only complete households may propose settlements");

for(const ref of ["documents.js","backup-crypto.js","smart-import.js","stats.js"])assert(html.includes('src="'+ref+'"'),"Script missing "+ref);
assert(html.includes("saldo-diario-data-v1"),"Legacy storage key must be kept");
assert(html.includes("data-saving-view=\"analysis\""),"Savings analysis panel missing");
assert(html.includes("data-saving-view=\"goals\""),"Savings goals panel missing");
assert(html.includes("sourceDocumentIds"),"Original document references missing");
assert(html.includes("backup-password-form"),"Encrypted backup form missing");
assert(!html.includes("Cargar datos de demostración"),"Destructive demo button must not appear");
const manifest=JSON.parse(fs.readFileSync("manifest.webmanifest","utf8"));
assert.equal(manifest.id,"./");assert.equal(manifest.short_name,"Budviva");
assert(manifest.icons.some(x=>x.src==='icon.svg?v='+releaseVersion),'Manifest icon must match release version');
assert(html.includes('icon.svg?v='+releaseVersion),'Favicon must match release version');
for(const page of ["privacidad.html","soporte.html","datos-y-privacidad.html"])assert(fs.readFileSync(page,"utf8").includes("<html lang=\"es\">"),page+" must exist");
const sw=fs.readFileSync("sw.js","utf8");
assert(sw.includes("navigationFallback(request.url)"),"Offline navigation must be routed by page");
assert(sw.includes("'/datos-y-privacidad.html'"),'El centro de privacidad debe funcionar sin conexión después de instalar la PWA');
assert(sw.includes("CACHE_PREFIX + '"+releaseVersion+"'"),"Service worker cache must match release version");
assert(sw.includes("cache.put(fallback, copy)"),"Navigations must be cached to their own route");
assert(!sw.includes("cache.put('./index.html',copy)"),"Never overwrite home with another page");
console.log("✅ Budviva Web audit: 5 navigation tabs, JS syntax, source documents, privacy and data compatibility");

const crypto=require("node:crypto");
const vendorManifest=JSON.parse(fs.readFileSync("vendor/manifest.json","utf8"));
assert.equal(vendorManifest.versions["pdfjs-dist"],"6.5.438");
assert.equal(vendorManifest.versions["tesseract.js"],"5.1.1");
for(const entry of vendorManifest.assets){
 const bytes=fs.readFileSync("vendor/"+entry.name);
 assert.equal(bytes.length,entry.size,entry.name+" size");
 assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),entry.sha256,entry.name+" sha256");
}
const importSrc=fs.readFileSync("smart-import.js","utf8");
assert(!/https?:\/\/(?:cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com)/.test(importSrc),"No external OCR/PDF scripts");
assert(importSrc.includes("pdf/pdf.mjs")&&importSrc.includes("ocr/worker.min.js"));
console.log("✅ Local OCR/PDF assets passed SHA-256 checks");
