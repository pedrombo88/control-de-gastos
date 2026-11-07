const test=require('node:test');
const assert=require('node:assert/strict');
const {calculate}=require('../shared-expenses.js');
const couple=['ana','alex'];
const expense=(payerId,amountCents,shareBasisPointsA)=>({type:'expense',payerId,amountCents,...(shareBasisPointsA===undefined?{}:{shareBasisPointsA})});
test('caso real de aceptación: gastos 12 € y 8 €, compensación de 2 € confirmada',()=>{
  const before=calculate([
    expense('ana',1200,5000),expense('alex',800,5000)
  ],couple);
  assert.equal(before.totalExpensesCents,2000);
  assert.deepEqual(before.transfer,{from:'alex',to:'ana',amountCents:200});
  assert.equal(before.totalSettlementsCents,0);

  const after=calculate([
    expense('ana',1200,5000),expense('alex',800,5000),
    {type:'settlement',payerId:'alex',receiverId:'ana',amountCents:200}
  ],couple);
  assert.equal(after.transfer,null);
  assert.equal(after.totalExpensesCents,2000);
  assert.equal(after.totalSettlementsCents,200);
  assert.equal(after.netCents.ana,0);
  assert.equal(after.netCents.alex,0);
});

test('reparto al 50 %: quien menos pagó debe la mitad de la diferencia',()=>{
  const r=calculate([expense('ana',30000),expense('alex',10000)],couple);
  assert.equal(r.totalExpensesCents,40000);
  assert.deepEqual(r.transfer,{from:'alex',to:'ana',amountCents:10000});
});
test('gastos con porcentajes individuales, redondeo al céntimo',()=>{
  const r=calculate([expense('ana',10001,7000)],couple);
  assert.deepEqual(r.transfer,{from:'alex',to:'ana',amountCents:3000});
  assert.equal(r.shareCents.ana,7001);
});
test('liquidar deuda no crea gasto personal ni altera gasto total',()=>{
  const r=calculate([expense('ana',10000),{type:'settlement',payerId:'alex',receiverId:'ana',amountCents:5000}],couple);
  assert.equal(r.transfer,null);
  assert.equal(r.totalExpensesCents,10000);
  assert.equal(r.totalSettlementsCents,5000);
});
test('la deuda cambia de sentido tras pagos de ambos',()=>{
  const r=calculate([expense('ana',10000),expense('alex',30000)],couple);
  assert.deepEqual(r.transfer,{from:'ana',to:'alex',amountCents:10000});
});
test('participantes y valores inválidos rechazados',()=>{
  assert.throws(()=>calculate([expense('otro',100)],couple));
  assert.throws(()=>calculate([expense('ana',-1)],couple));
  assert.throws(()=>calculate([expense('ana',1.7)],couple));
  assert.throws(()=>calculate([expense('ana',100,10001)],couple));
});

test('redondeo de importes impares y pagos que superan la deuda',()=>{
  const r=calculate([
    expense('ana',10005),
    {type:'settlement',payerId:'alex',receiverId:'ana',amountCents:10000}
  ],couple);
  assert.equal(r.shareCents.ana,5003);
  assert.equal(r.shareCents.alex,5002);
  assert.deepEqual(r.transfer,{from:'ana',to:'alex',amountCents:4998});
});
test('muchas operaciones nunca descuadran la suma entre personas',()=>{
  const records=Array.from({length:2000},(_,i)=>expense(i%2?'ana':'alex',1001+i,i%3===0?7000:5000));
  const result=calculate(records,couple);
  assert.equal(result.netCents.ana+result.netCents.alex,0);
  assert.equal(result.shareCents.ana+result.shareCents.alex,result.totalExpensesCents);
});
