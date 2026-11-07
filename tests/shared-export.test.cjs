/* Budviva: contrato de exportación de Compartidos, sin datos ni servicios reales. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const src=fs.readFileSync('compartidos.js','utf8');
const html=fs.readFileSync('compartidos.html','utf8');
function section(from,to){
 const start=src.indexOf(from),end=src.indexOf(to,start+from.length);
 assert(start>=0&&end>start,'Sección de exportación no encontrada');
 return src.slice(start,end);
}
const exportSource=section('function sharedExportData(){','function saveSharedFile(');
const csvSource=section('function csvCell(value){','async function exportShared(');
const {csvCell,csvSheet}=new Function(csvSource+'return {csvCell,csvSheet};')();
const sample={
 household:{id:'group-1',title:'Prueba de pareja'},
 user:{id:'member-a'},
 members:[{user_id:'member-a',display_name:'Ana',joined_at:'2026-11-07T10:00:00Z'},
          {user_id:'member-b',display_name:'Alex',joined_at:'2026-11-07T10:01:00Z'}],
 expenses:[{id:'expense-1',spent_on:'2026-11-07',title:'Compra doméstica',
   category:'otros',payer_id:'member-a',author_id:'member-a',amount_cents:1200,
   share_basis_points_a:5000,created_at:'2026-11-07T10:10:00Z'}],
 settlements:[{id:'payment-1',payer_id:'member-b',receiver_id:'member-a',amount_cents:200,
   status:'confirmed',created_at:'2026-11-07T10:20:00Z',reviewed_at:'2026-11-07T10:30:00Z'}]
};
function exportFixture({online=true,...override}={}){
 const data={...sample,...override};
 return new Function('navigator','household','user','members','expenses','settlements',
   exportSource+'return sharedExportData;')({onLine:online},data.household,data.user,
      data.members,data.expenses,data.settlements)();
}
test('JSON incluye participantes, gastos, pagadores y compensación íntegra',()=>{
 const result=exportFixture();
 assert.equal(result.format,'budviva-shared-export-v1');
 assert.equal(result.household.id,'group-1');
 assert.deepEqual(result.members.map(m=>m.id),['member-a','member-b']);
 assert.equal(result.expenses[0].amountCents,1200);
 assert.equal(result.expenses[0].shareBasisPointsA,5000);
 assert.equal(result.expenses[0].authorId,'member-a');
 assert.equal(result.settlements[0].amountCents,200);
 assert.equal(result.settlements[0].status,'confirmed');
 assert.equal(result.settlements[0].reviewedAt,'2026-11-07T10:30:00Z');
 assert(!JSON.stringify(result).includes('refresh_token'));
 assert(!JSON.stringify(result).includes('access_token'));
});
test('Sin Internet o sin grupo no se exporta una copia potencialmente incompleta',()=>{
 assert.throws(()=>exportFixture({online:false}),/Conéctate a Internet/);
 assert.throws(()=>exportFixture({household:null}),/Inicia sesión/);
 assert.throws(()=>exportFixture({user:null}),/Inicia sesión/);
});
test('CSV neutraliza entradas peligrosas para Excel y conserva texto con comillas',()=>{
 for(const unsafe of ['=1+1','+SUM(A1:A2)','-10+20','@SUM(1,2)',' \t=HYPERLINK(1)']){
   assert(csvCell(unsafe).startsWith("\"'"),'No neutralizada: '+unsafe);
 }
 assert.equal(csvCell('Comida "para dos"'),'"Comida ""para dos"""');
 const csv=csvSheet([['Nombre','Importe'],['=FORMULA(1)','12,00']]);
 assert(csv.startsWith('\uFEFF'),'Falta marca UTF-8');
 assert(csv.includes("\"'=FORMULA(1)\""),'La fórmula debe ser tratada como texto');
 assert(csv.includes('\r\n'),'Separación de filas esperada');
});
test('Interfaz diferencia copia JSON completa y CSV de resumen no cifrado',()=>{
 assert(html.includes('JSON completo'));
 assert(html.includes('CSV resumen'));
 assert(html.includes('sin cifrar'));
});
test('Se fuerza una recarga completa antes de generar las exportaciones',()=>{
 assert.match(src,/async function exportShared\(format\)\{\s*await load\(\);/);
 assert(src.includes('if(lastLoadedGeneration!==loadGeneration||!household||!user)'));
 assert(src.includes('readAllRows(\'bv_expenses\''));
 assert(src.includes('readAllRows(\'bv_settlements\''));
});
