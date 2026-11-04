const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm");
function load(file){
 const ctx={window:{},Date,Intl,Map,Set,console,crypto:globalThis.crypto,Blob,File:globalThis.File};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,"utf8"),ctx,{filename:file});return ctx.window;
}
test("CSV imports expenses and income with correct signs",()=>{
 const {CGSmartImport}=load("smart-import.js");
 const rows=CGSmartImport.parseCSV("Fecha;Concepto;Importe\n04/11/2026;Compra;-3,25\n04/11/2026;Nómina;1500,00","2026-11-04");
 assert.equal(rows.length,2);assert.equal(rows[0].amount,325);assert.equal(rows[0].type,"expense");
 assert.equal(rows[1].amount,150000);assert.equal(rows[1].type,"income");
});
test("OCR receipt parser only accepts recognised products",()=>{
 const {CGSmartImport}=load("smart-import.js");
 const receipt=CGSmartImport.parseReceipt("TIENDA\nAGUA 1,20\nGALLETAS 2,00\nTOTAL 3,20","2026-11-04")[0];
 assert.equal(receipt.amount,320);assert.equal(receipt.items.length,2);
 assert.equal(receipt.items[0].necessity,"pending");
});
test("Money calculations preserve cents and distinguish need from wish",()=>{
 const {CGStats}=load("stats.js");
 const tx=[{id:"a",type:"expense",date:"2026-11-04",amount:10000,category:"alimentacion",receiptItems:[{name:"Pan",amount:3000,necessity:"necessary"},{name:"Chuches",amount:7000,necessity:"optional"}]}];
 const cats=[{id:"alimentacion",name:"Alimentación",type:"expense"}];
 const r=CGStats.analyzeSavings(tx,["2026-11"],cats,25);
 assert.equal(r.optional,7000);assert.equal(r.reduction,1750);
 assert.equal(r.annualProjection,21000);
});
test("Reconciler rejects duplicate same-source movements",()=>{
 const {CGReconcile}=load("reconcile.js");
 const bank={id:"a",type:"expense",date:"2026-11-04",amount:2500,title:"Mercado",importSource:"bank"};
 assert.throws(()=>CGReconcile.reconcile(bank,{...bank,id:"b",importSource:"bank"}),/bancarios/);
});
test("Original documents API is present and bounded",()=>{
 const {BudvivaDocuments}=load("documents.js");
 assert.equal(typeof BudvivaDocuments.saveFile,"function");
 assert.equal(typeof BudvivaDocuments.exportBundle,"function");
 assert.equal(typeof BudvivaDocuments.decodeBundle,"function");
 assert.equal(typeof BudvivaDocuments.unlinkTransaction,"function");
 assert.equal(BudvivaDocuments.MAX_FILE,15*1024*1024);
});
