'use strict';
// Invoked inside the inventory domain clone. The caller commits state and audit together.
function applyPurchase({state, command:c, actor, event, move, getItem, quantity, fail, text, date}) {
  state.foodPurchases ||= [];
  if(c.type==='foodList'){
    state.foodLists ||= [];
    if(!Array.isArray(c.lines)||!c.lines.length||c.lines.length>100)fail('Incluye entre 1 y 100 productos.');
    const seen=new Set();
    const lines=c.lines.map(row=>{
      const item=getItem(state,row.item);if(seen.has(item.id))fail('Producto repetido.');seen.add(item.id);
      return {item:item.id,name:item.name,unit:item.unit,qty:quantity(row.qty,item,false),observedQty:row.observedQty==null?null:quantity(row.observedQty,item),min:row.min==null?null:quantity(row.min,item),max:row.max==null?null:quantity(row.max,item)};
    });
    const doc={id:c.id,date:date(c.date),market:text(c.market,'Lugar',100),note:event.note,actor:event.actor,at:event.at,lines};
    state.foodLists.push(doc);event.detail={list:doc};return;
  }
  const amount = (v,label) => {
    if(v===null || v===undefined)return null;
    if(typeof v!=='number'||!Number.isSafeInteger(v)||v<0||v>1000000000)fail(`${label}: usa centavos enteros, positivos o cero.`);
    return v;
  };
  const addReceipt=(doc,lines)=>{
    if(!Array.isArray(lines)||!lines.length)fail('Indica lo que llegó.');
    const seen=new Set();
    for(const row of lines){
      if(seen.has(row.item))fail('No repitas un artículo en la recepción.');seen.add(row.item);
      const line=doc.lines.find(l=>l.item===row.item);if(!line)fail('Artículo ajeno a esta compra.');
      const qty=quantity(row.qty,getItem(state,row.item),false);
      if(qty>line.stockQty-line.receivedQty)fail('La recepción excede lo comprado pendiente.',409);
      move(doc.destination,row.item,qty);line.receivedQty+=qty;
    }
    doc.receipts.push({id:c.id,at:event.at,actor:event.actor,lines:event.deltas.map(d=>({item:d.item,qty:d.qty}))});
    doc.status=doc.lines.every(l=>l.receivedQty===l.stockQty)?'received':'partial';
  };
  if(c.type==='foodPurchase'){
    if(state.foodPurchases.some(p=>p.id===c.id))fail('La compra ya existe.',409);
    if(!['cedis','sucursal'].includes(c.destination))fail('Destino inválido.');
    if(typeof c.received!=='boolean')fail('Indica si ya llegó al destino.');
    const businessDate=date(c.date);if(businessDate>event.date)fail('Una compra realizada no puede tener fecha futura.');
    const seen=new Set();
    if(!Array.isArray(c.lines)||!c.lines.length||c.lines.length>100)fail('Incluye entre 1 y 100 productos.');
    const lines=c.lines.map(row=>{
      const item=getItem(state,row.item);
      if(seen.has(item.id))fail('Agrupa o separa en otra compra los renglones repetidos del mismo artículo.');seen.add(item.id);
      const stockQty=quantity(row.stockQty,item,false);
      const purchaseUnit=text(row.purchaseUnit,'Unidad de compra',40);
      const qty=Number(row.purchaseQty), scaled=Math.round(qty*1000);
      if(typeof row.purchaseQty!=='number'||!Number.isFinite(qty)||qty<=0||qty>1000000||Math.abs(qty*1000-scaled)>1e-6)fail('Cantidad de compra inválida; máximo tres decimales.');
      if(purchaseUnit===item.unit&&scaled!==stockQty)fail('En la misma unidad, cantidad comprada y entrada deben coincidir.');
      const conversionNote=text(row.conversionNote||'','Equivalencia',300,false);
      if(purchaseUnit!==item.unit&&!conversionNote)fail('Indica la equivalencia confirmada entre compra e inventario.');
      const priceCents=amount(row.unitPriceCents,'Precio por unidad');
      const computed=priceCents===null?null:Number((BigInt(priceCents)*BigInt(scaled)+500n)/1000n);
      const declared=amount(row.totalCents,'Importe del renglón');
      if(computed!==null&&declared!==null&&computed!==declared)fail('El importe no coincide con cantidad por precio. Aclara el importe final.');
      return {item:item.id,name:item.name,stockUnit:item.unit,stockQty,purchaseUnit,purchaseQty:scaled,conversionNote,unitPriceCents:priceCents,totalCents:declared??computed,receivedQty:0};
    });
    const complete=lines.every(l=>l.totalCents!==null);
    const knownTotalCents=lines.reduce((n,l)=>n+(l.totalCents??0),0);
    if(!Number.isSafeInteger(knownTotalCents)||knownTotalCents>1000000000)fail('Importe total fuera de rango.');
    const doc={id:c.id,business:'chicanito',date:businessDate,supplier:text(c.supplier,'Proveedor',150),market:text(c.market,'Lugar de compra',100),destination:c.destination,currency:'MXN',receipt:text(c.receipt||'','Comprobante',200,false),note:event.note,actor:event.actor,createdAt:event.at,verified:true,status:'purchased',lines,receipts:[],costStatus:complete?'complete':'pending',knownTotalCents,totalCents:complete?knownTotalCents:null,paymentMethod:text(c.paymentMethod||'no informado','Medio de pago',60),paidCents:amount(c.paidCents,'Importe pagado')};
    if(doc.totalCents!==null&&doc.paidCents>doc.totalCents)fail('El pago excede el total de esta compra.');
    if(c.list){if(!state.foodLists?.some(l=>l.id===c.list))fail('Lista de origen no encontrada.');doc.list=c.list;}
    state.foodPurchases.push(doc);
    // Mirror a fully consumed order for compatibility: the web cannot receive it a second time.
    state.purchases ||= [];
    state.purchases.push({id:c.id,supplier:doc.supplier,location:doc.destination,lines:lines.map(l=>({item:l.item,qty:l.stockQty})),received:[],foodia:true,at:event.at,actor:actor.name});
    if(c.received)addReceipt(doc,lines.map(l=>({item:l.item,qty:l.stockQty/1000})));
    event.detail={document:doc};event.date=businessDate;
  }else{
    const doc=state.foodPurchases.find(p=>p.id===c.purchase);
    if(!doc)fail('Compra no encontrada.',404);
    if(doc.status==='void')fail('La compra fue anulada.',409);
    if(c.type==='foodReceive')addReceipt(doc,c.lines);
    else if(c.type==='foodVoid'){
      if(!event.note)fail('Indica el motivo de la anulación.');
      for(const l of doc.lines)if(l.receivedQty)move(doc.destination,l.item,-l.receivedQty);
      doc.status='void';doc.voidedAt=event.at;doc.voidedBy=event.actor;doc.voidReason=event.note;
    }else if(c.type==='foodCost'){
      if(!event.note)fail('Indica la referencia o motivo de la actualización de costos.');
      if(!Array.isArray(c.lines)||!c.lines.length)fail('Indica costos por artículo.');
      const seen=new Set();
      for(const row of c.lines){
        if(seen.has(row.item))fail('Artículo repetido.');seen.add(row.item);
        const l=doc.lines.find(l=>l.item===row.item);if(!l)fail('Artículo ajeno a la compra.');
        const price=amount(row.unitPriceCents,'Precio'),total=amount(row.totalCents,'Importe');
        if(price===null&&total===null)fail('Indica precio o importe.');
        const computed=price===null?null:Number((BigInt(price)*BigInt(l.purchaseQty)+500n)/1000n);
        if(total!==null&&computed!==null&&total!==computed)fail('El importe no coincide con cantidad por precio.');
        l.unitPriceCents=price;l.totalCents=total??computed;
      }
      doc.knownTotalCents=doc.lines.reduce((n,l)=>n+(l.totalCents??0),0);
      if(doc.knownTotalCents>1000000000)fail('Importe total fuera de rango.');
      doc.costStatus=doc.lines.every(l=>l.totalCents!==null)?'complete':'pending';
      doc.totalCents=doc.costStatus==='complete'?doc.knownTotalCents:null;
      if(c.paidCents!==undefined)doc.paidCents=amount(c.paidCents,'Importe pagado');
      if(doc.totalCents!==null&&doc.paidCents>doc.totalCents)fail('El pago excede el total.');
      doc.costUpdatedAt=event.at;
    }else fail('Operación de compras desconocida.');
    event.detail={document:doc};
  }
  const doc=event.detail.document,order=state.purchases.find(p=>p.id===doc.id);
  if(order)order.received=doc.lines.map(l=>({item:l.item,qty:l.receivedQty}));
}
module.exports={applyPurchase};
