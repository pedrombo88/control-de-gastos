/* Budviva: revisión estática del contrato de autorización de Compartidos.
 * No ejecuta SQL, no requiere credenciales y no altera el proyecto remoto.
 * La comprobación real entre usuarios sigue siendo una prueba independiente. */
'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sql=fs.readFileSync('backend/compartidos.sql','utf8').toLowerCase();
const tables=['bv_households','bv_members','bv_invitations','bv_expenses','bv_settlements','bv_household_closure_approvals'];
const publicRpc=[
 'bv_create_household','bv_create_invite','bv_join_household',
 'bv_review_settlement','bv_manage_household_closure','bv_leave_empty_household'
];

test('Todas las tablas compartidas activan RLS',()=>{
 for(const table of tables)
  assert(sql.includes('alter table public.'+table+' enable row level security;'),table);
});
test('Ninguna tabla concede lectura pública directa',()=>{
 const grants=[...sql.matchAll(/grant\s+([^;]+);/g)].map(x=>x[1]);
 for(const statement of grants){
  if(!/\b(to|,|\s)\s*anon\b/.test(statement))continue;
  for(const table of tables)assert(!new RegExp('\\b'+table+'\\b').test(statement),'GRANT inesperado a anon en '+table);
 }
});
test('Lecturas de finanzas requieren pertenencia al grupo',()=>{
 for(const table of ['bv_households','bv_members','bv_expenses','bv_settlements','bv_household_closure_approvals']){
  const policyPattern=new RegExp('create policy "[^"]+" on public\\.'+table+'\\s+for select to authenticated using\\s*\\(\\s*private\\.bv_is_member\\(');
  assert(policyPattern.test(sql),table+' sin política de pertenencia');
 }
});
test('Las invitaciones no tienen políticas ni SELECT directo',()=>{
 assert(!/create policy\s+["'][^"']+["']\s+on public\.bv_invitations/i.test(sql));
 assert(!/grant\s+select\s+on\s+public\.bv_invitations\s+to\s+authenticated/i.test(sql));
});
test('Las operaciones privilegiadas validan sesión y revocan ejecución pública',()=>{
 for(const rpc of publicRpc){
  assert(sql.includes('function public.'+rpc+'('),rpc+' no definida');
  assert(new RegExp('revoke all on function[^;]*\\b'+rpc+'\\(').test(sql),rpc+' sin REVOKE');
  assert(new RegExp('grant execute on function[^;]*\\b'+rpc+'\\([^;]+to authenticated;').test(sql),rpc+' sin GRANT restringido');
 }
});
test('Nadie puede confirmar compensaciones mediante UPDATE directo',()=>{
 assert(sql.includes('-- no update policy: review only through a constrained rpc'));
 assert(!/create policy[^;]+on public\.bv_settlements\s+for update\b/.test(sql));
});
test('El inicio de gastos y compensaciones exige exactamente dos participantes',()=>{
 for(const table of ['bv_expenses','bv_settlements'])
  assert(new RegExp('select count\\(\\*\\) from public\\.bv_members m where m\\.household_id='+table+'\\.household_id\\)=2').test(sql),table);
});
