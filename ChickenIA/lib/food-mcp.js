'use strict';
const {McpServer}=require('@modelcontextprotocol/sdk/server/mcp.js');
const {z}=require('zod');
const {service}=require('./food-service');
const str=z.string().trim().min(1).max(150),id=z.string().uuid(),qty=z.number().positive().max(1000000),cents=z.number().int().min(0).max(1000000000),date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/),note=z.string().max(1000).default('');
const stockLine=z.object({item:str,qty}).strict();
const costLine=z.object({item:str,unitPriceCents:cents.nullable().optional(),totalCents:cents.nullable().optional()}).strict();
const purchaseLine=costLine.extend({stockQty:qty,purchaseQty:qty,purchaseUnit:str,conversionNote:z.string().max(300).optional()}).strict();
const operation=z.discriminatedUnion('type',[
  z.object({type:z.literal('request'),due:date,lines:z.array(stockLine).min(1).max(100),note}).strict(),
  z.object({type:z.literal('send'),request:id,lines:z.array(stockLine).min(1).max(100),note}).strict(),
  z.object({type:z.literal('receive'),request:id,shipment:id,lines:z.array(stockLine).min(1).max(100),note}).strict(),
  z.object({type:z.literal('transitReturn'),request:id,shipment:id,lines:z.array(stockLine).min(1).max(100),note:z.string().min(1).max(1000)}).strict(),
  z.object({type:z.literal('closeRequest'),request:id,note:z.string().min(1).max(1000)}).strict(),
  z.object({type:z.literal('foodPurchase'),supplier:str,market:str,date,destination:z.enum(['cedis','sucursal']),received:z.boolean(),lines:z.array(purchaseLine).min(1).max(100),list:id.optional(),receipt:z.string().max(200).optional(),paymentMethod:z.string().max(60).optional(),paidCents:cents.nullable().optional(),note}).strict(),
  z.object({type:z.literal('foodReceive'),purchase:id,lines:z.array(stockLine).min(1).max(100),note}).strict(),
  z.object({type:z.literal('foodVoid'),purchase:id,note:z.string().min(1).max(1000)}).strict(),
  z.object({type:z.literal('foodCost'),purchase:id,lines:z.array(costLine).min(1).max(100),paidCents:cents.nullable().optional(),note:z.string().min(1).max(1000)}).strict(),
  z.object({type:z.literal('foodList'),date,market:str,lines:z.array(stockLine.extend({observedQty:z.number().min(0).max(1000000).nullable().optional(),min:z.number().min(0).max(1000000).nullable().optional(),max:z.number().min(0).max(1000000).nullable().optional()}).strict()).min(1).max(100),note}).strict(),
  z.object({type:z.literal('catalog'),name:str,unit:z.string().min(1).max(40),area:str,kind:z.enum(['supply','equipment','finished']),step:z.union([z.literal(1),z.literal(250),z.literal(500),z.literal(1000)]),note}).strict(),
  z.object({type:z.literal('initial'),location:z.enum(['cedis','sucursal']),lines:z.array(z.object({item:str,qty:z.number().min(0).max(1000000)}).strict()).min(1).max(100),note:z.string().min(1).max(1000)}).strict(),
]);
function createServer(repo,query,actor){
  const api=service(repo,query,actor),server=new McpServer({name:'foodia',version:'0.1.0'});
  const register=(name,description,inputSchema,write,handler,destructive=false)=>server.registerTool(name,{description,inputSchema,annotations:{readOnlyHint:!write,destructiveHint:destructive,idempotentHint:name==='foodia_commit'||!write,openWorldHint:false},_meta:{securitySchemes:[{type:'oauth2',scopes:write?['foodia:read','foodia:write']:['foodia:read']}]}},async args=>{
    try{const result={environment:actor.environment||'server',...await handler(args)};return {content:[{type:'text',text:JSON.stringify(result)}],structuredContent:result};}
    catch(e){return {isError:true,content:[{type:'text',text:e.status?e.message:'No se pudo completar la operación. Reintenta con el mismo borrador; no dupliques la captura.'}]};}
  });
  register('foodia_session','Identidad autenticada, negocio y permisos. No solicita contraseñas.',z.object({}).strict(),false,async()=>({user:actor.name,business:actor.business,canWrite:actor.canWrite}));
  register('foodia_inventory','Busca artículos y consulta existencias actuales. Devuelve unidades reales, precisión y null para saldo inicial desconocido.',z.object({search:z.string().max(150).default('')}).strict(),false,({search})=>api.inventory(search));
  register('foodia_prepare','Prepara y valida un borrador, sin afectar inventario ni registrar la compra. Tipos: foodList (pedido orientador), foodPurchase (compra ya verificada), foodReceive (llegada pendiente), foodCost (completar/corregir costos), foodVoid (anular), catalog (nuevo producto), initial (saldo físico confirmado anterior a nuevas entradas). Cantidades de entrada en unidades humanas, dinero en centavos MXN, step del catálogo en milésimas (1=0.001). No inventes saldo inicial, equivalencias ni precios. Sam’s tiene destino CEDIS; received significa que llegó físicamente. Min/max no bloquean. Una compra puede incluir productos fuera de lista.',z.object({operation}).strict(),true,({operation:{type,...values}})=>api.prepare(type,values));
  register('foodia_commit','Guarda el borrador autorizado del usuario y devuelve folio. Puede modificar existencias o anular una compra: explica el efecto del borrador antes de ejecutarlo. Reutiliza el mismo draftId en reintentos. Un conflicto de versión exige revisar datos y preparar de nuevo; no repetir automáticamente con un ID nuevo.',z.object({draftId:id}).strict(),true,({draftId})=>api.commit(draftId),true);
  register('foodia_purchases','Consulta compras FoodIA por fechas inclusive, precios, recepción, pagos y costos pendientes. No incluye gastos históricos no registrados aquí. Importes en centavos y cantidades de líneas en milésimas.',z.object({from:date,to:date}).strict(),false,({from,to})=>api.purchases(from,to));
  register('foodia_lists','Consulta las últimas 100 listas orientadoras y sus existencias observadas. Cantidades en milésimas. No son compras ni movimientos.',z.object({}).strict(),false,()=>api.lists());
  register('foodia_movements','Consulta solicitudes CEDIS a sucursal por fecha solicitada inclusive, con envíos, recepciones y devoluciones. Cantidades humanas y unidad de catálogo. Sin costos. Para escribir usa foodia_prepare con request (solicitar, no mueve saldo), send (CEDIS a tránsito), receive (tránsito a sucursal), transitReturn (tránsito a CEDIS) o closeRequest (cierre con motivo). En receive y transitReturn indica request y shipment. No confundas una solicitud con una entrega.',z.object({from:date,to:date}).strict(),false,({from,to})=>api.movements(from,to));
  return server;
}
module.exports={createServer,operation};
