'use strict';
const VERSION='controles-v1';
const CUTS=[
 {id:'apertura',time:'09:30',block:'apertura',label:'Listos para abrir',focus:'Personal, caja, inventario y producción de apertura revisados; cantidades y calidad verificadas.'},
 {id:'comida',time:'12:00',block:'operacion',label:'Listos para la comida',focus:'Producción de comida lista y barras abastecidas, con cantidad y calidad verificadas por producto.'},
 {id:'ajuste',time:'16:00',block:'operacion',label:'Ajustar la producción',focus:'Revisar lo producido, lo disponible y lo que falta vender. Decidir qué continuar, reducir o detener.'},
 {id:'cierre',time:'19:00',block:'cierre',label:'Día cerrado y reportado',focus:'Ventas, caja, producción, sobrantes, mermas e incidencias completos; áreas verificadas al cierre.'}
];
const area=(id,name,indicator,requirements)=>({id,name,indicator,requirements});
const AREAS=[
 area('sucursal_apertura','Apertura de Sucursal','Sucursal lista para iniciar venta',{
  apertura:['Local, mobiliario y limpieza listos','Descarga recibida y productos resguardados después de verificar']}),
 area('rastro','Rastro','Abastecimiento de proteínas completo y oportuno',{
  apertura:['Entrega contra solicitud verificada en cantidad y condición','Entradas, salidas y diferencias registradas'],
  comida:['Proteínas solicitadas para comida entregadas y verificadas'],
  ajuste:['Existencias y necesidades restantes revisadas; abasto ajustado'],
  cierre:['Movimientos y saldos registrados; condiciones del área y pase de salida verificados']}),
 area('almacen','Almacén','Insumos solicitados completos y a tiempo',{
  apertura:['Insumos de apertura recibidos contra solicitud, sin faltantes'],
  comida:['Insumos requeridos para comida disponibles'],
  ajuste:['Necesidades restantes revisadas y solicitudes ajustadas'],
  cierre:['Entradas, entregas y pendientes de abastecimiento registrados']}),
 area('cocina','Cocina','Plan de producción cumplido por corte',{
  apertura:['Preparaciones de apertura listas según orden y residual disponible'],
  comida:['Toda la producción requerida para comida terminada'],
  ajuste:['Producción restante ajustada a existencias y venta esperada'],
  cierre:['Producción, sobrantes y consumos registrados; área y pase de salida verificados']}),
 area('rosticero','Rosticero','Rostizado disponible conforme al plan',{
  apertura:['Primera tanda terminada y estación lista para vender'],
  comida:['Rostizado requerido para comida terminado y disponible'],
  ajuste:['Siguientes cargas ajustadas a demanda y existencias'],
  cierre:['Producción y sobrantes registrados; resguardo y limpieza verificados']}),
 area('freidoras','Freidoras','Producción y abastecimiento cumplidos por corte',{
  apertura:['Cruji y complementos requeridos listos para apertura'],
  comida:['Cruji y complementos requeridos para comida terminados'],
  ajuste:['Reposiciones ajustadas; evitar producir de más o de menos'],
  cierre:['Producción y sobrantes registrados; equipo y área revisados']}),
 area('ventas_barras','Ventas / Barras','Barra abastecida y calidad verificada',{
  apertura:['Surtido montado, cantidades cotejadas y consumibles disponibles'],
  comida:['Barras actualizadas y abastecidas para comida'],
  ajuste:['Reposiciones y bajada de producto revisadas y autorizadas'],
  cierre:['Sobrantes entregados y registrados; barras limpias y apagadas']}),
 area('trastes','Lavado de Trastes','Utensilios limpios disponibles para operar',{
  apertura:['Utensilios necesarios limpios y acomodados; insumos disponibles'],
  comida:['Utensilios disponibles sin frenar producción ni servicio'],
  cierre:['Lavado y acomodo completos; tarja y piso limpios al salir del turno']}),
 area('caja','Caja','Caja al corriente y cierre conciliado',{
  apertura:['Fondo, cambio, equipo y consumibles listos'],
  comida:['Ventas, cobros y gastos registrados al momento'],
  ajuste:['Ventas, cobros y gastos actualizados para ajustar producción'],
  cierre:['Ventas y medios de pago completos','Efectivo, gastos y entregas conciliados sin diferencias']}),
 area('supervision','Supervisión','Puntos de control en tiempo y forma',{
  apertura:['Personal, asistencia y uniformes revisados','Inventario inicial y recepción verificados','Reporte inicial revisado con responsables'],
  comida:['Cantidad y calidad verificadas de todos los artículos para comida','Pendientes revisados con responsables'],
  ajuste:['Producción acumulada, existencias y venta restante revisadas','Decisión por producto comunicada a las áreas'],
  cierre:['Ventas, producción, inventario final y mermas revisados','Cierre de áreas y pendientes siguientes verificados']})
];
const MOBILE=[
 {id:'moto_recepcion',name:'Móvil — Recepción',indicator:'Unidad abastecida y lista para salir',note:'Antes de salida: pedido, cantidades, calidad, empaques y condiciones de salida. Falta definir horario y unidad para activar la evaluación.'},
 {id:'moto_cierre',name:'Móvil — Cierre',indicator:'Cierre de unidad completo y conciliado',note:'Al terminar ruta: ventas, efectivo, sobrantes y salidas justificadas. Falta definir horario y unidad para activar la evaluación.'}
];
function requirements(cut){return AREAS.flatMap(a=>(a.requirements[cut]||[]).map((label,i)=>({id:`${a.id}:${i}`,area:a.id,label})));}
module.exports={VERSION,CUTS,AREAS,MOBILE,requirements};
