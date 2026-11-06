'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const edge=fs.readFileSync('backend/functions/bv-delete-account/index.ts','utf8');
const schema=fs.readFileSync('backend/compartidos.sql','utf8');

test('La baja no selecciona columnas inexistentes en las tablas de referencias',()=>{
  const iterator=edge.match(/for\(const \[table,column\] of \[([\s\S]*?)\] as const\)\{([\s\S]*?)\n  \}/);
  assert(iterator,'No se ha encontrado la validación de referencias');
  const pairs=[...iterator[1].matchAll(/\["(bv_[a-z_]+)","([a-z_]+)"\]/g)];
  assert.equal(pairs.length,6,'La consulta debe cubrir las seis referencias financieras');
  assert.match(iterator[2],/\.select\(column\)\.eq\(column,identity\.user\.id\)\.limit\(1\)/);
  for(const [,table,column] of pairs){
    const definition=schema.match(new RegExp('create table if not exists public\\.'+table+' \\(([\\s\\S]*?)\\n\\);','i'));
    assert(definition,'Tabla no definida: '+table);
    assert(new RegExp('\\b'+column+'\\s+uuid\\b','i').test(definition[1]),table+'.'+column+' no existe');
  }
  assert(!/create table if not exists public\.bv_household_closure_approvals \([\s\S]*?\n\s*id\s+uuid\b/i.test(
    schema.match(/create table if not exists public\.bv_household_closure_approvals \([\s\S]*?\n\);/i)?.[0]||''
  ),'El control no debe depender de un id inexistente en aprobaciones');
});
