/* Budviva — motor de liquidación doméstica, sin transferencias en movimientos personales.
   Importes en céntimos. API aislada para futura sincronización segura entre dispositivos. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.BudvivaShared=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function int(n,label){if(!Number.isSafeInteger(n)||n<0)throw new TypeError(label+' debe ser un entero no negativo');return n;}
  function member(id){if(typeof id!=='string'||!id.trim())throw new TypeError('Identificador de participante obligatorio');return id;}
  function normalize(record,members){
    if(!record||typeof record!=='object')throw new TypeError('Registro inválido');
    if(!Array.isArray(members)||members.length!==2||members[0]===members[1])throw new TypeError('Se necesitan dos miembros diferentes');
    members.forEach(member);
    if(!members.includes(record.payerId))throw new TypeError('Pagador fuera del grupo');
    if(record.type==='settlement'){
      if(!members.includes(record.receiverId)||record.receiverId===record.payerId)throw new TypeError('Destinatario inválido');
      return {type:'settlement',payerId:record.payerId,receiverId:record.receiverId,amountCents:int(record.amountCents,'Importe')};
    }
    if(record.type!=='expense')throw new TypeError('Tipo desconocido');
    const shareA=record.shareBasisPointsA===undefined?5000:int(record.shareBasisPointsA,'Porcentaje');
    if(shareA>10000)throw new RangeError('Porcentaje superior al 100 %');
    return {type:'expense',payerId:record.payerId,amountCents:int(record.amountCents,'Importe'),shareBasisPointsA:shareA};
  }
  function calculate(records,members){
    if(!Array.isArray(records))throw new TypeError('Se espera una lista de registros');
    members.forEach(member);
    if(members.length!==2||members[0]===members[1])throw new TypeError('Dos participantes distintos');
    const net={[members[0]]:0,[members[1]]:0};
    const paid={[members[0]]:0,[members[1]]:0};
    const owed={[members[0]]:0,[members[1]]:0};
    let expenses=0,settlements=0;
    for(const raw of records){
      const r=normalize(raw,members);
      if(r.type==='expense'){
        const partA=Math.round(r.amountCents*r.shareBasisPointsA/10000);
        const partB=r.amountCents-partA;
        paid[r.payerId]+=r.amountCents;
        owed[members[0]]+=partA;
        owed[members[1]]+=partB;
        net[r.payerId]+=r.amountCents;
        net[members[0]]-=partA;
        net[members[1]]-=partB;
        expenses+=r.amountCents;
      }else{
        net[r.payerId]+=r.amountCents;
        net[r.receiverId]-=r.amountCents;
        settlements+=r.amountCents;
      }
    }
    const diff=net[members[0]];
    if(net[members[1]]!==-diff)throw new Error('Balance desequilibrado');
    return {totalExpensesCents:expenses,totalSettlementsCents:settlements,paidCents:paid,shareCents:owed,netCents:net,
      transfer:diff===0?null:{from:diff<0?members[0]:members[1],to:diff<0?members[1]:members[0],amountCents:Math.abs(diff)}};
  }
  return Object.freeze({calculate,normalize});
});
