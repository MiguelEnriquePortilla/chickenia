'use strict';
// Confirmed in the Rastro transcript and follow-up: 06:00 arrival, separate
// Sucursal opening, ROSTI marinade and ledger verification before release.
const task=(name,criticality,target,block,indicator='PROCESO')=>[name,criticality,false,null,indicator,target,block];
function build(legacy){
  const retired=new Set([
    'Costilla, pollo rostizado y crujiente verificados antes de salida',
    'Vegetales verificados antes de salida','Áreas y utensilios ordenados antes de salida',
    'Existencias completas para pase de salida (jabón, sal, arroz, leche, sal-pimienta, cloro, agua, bolsas)',
    'Pase de salida generado y firmado','Actividades escritas en pizarrón al pase de salida',
  ]);
  const production={
    'Pollo rostizado preparado':['Pollo para ROSTI preparado según orden del día','Cantidad solicitada en la orden; indicar en observaciones cuando no se solicitó'],
    'Pollo crujiente preparado':['Pollo para CRUJI preparado según orden del día','Cantidad solicitada en la orden; indicar en observaciones cuando no se solicitó'],
  };
  const rastro=[
    task('Confirmar llegada a Rastro a las 6:00 a. m.','alta','Registrar hora real de llegada en observaciones','apertura','PUNTUALIDAD'),
    task('Revisar solicitud de inventario para Sucursal','alta','Identificar productos y cantidades solicitadas de Rastro y Almacén','apertura'),
    task('Preparar y cargar el inventario solicitado','alta','Cargar lo solicitado; documentar faltantes y salida en Inventario, sin crear otro movimiento desde esta lista','apertura'),
    task('Trasladar el inventario de Rastro y Almacén a Sucursal','alta','La descarga y apertura del local se revisan en Apertura de Sucursal','apertura'),
    task('Revisar las actividades de producción solicitadas el día anterior','alta','Preparaciones y cantidades según la orden del día; no producir una cantidad fija por defecto','operacion'),
    ...legacy.rastro.filter(r=>!retired.has(r[0])).map(row=>{
      const r=[...row];
      if(production[r[0]]){const [name,target]=production[r[0]];r[0]=name;r[5]=target;}
      r[6]='operacion';return r;
    }),
    task('Preparar papa gajo y resguardarla en refrigeración cuando se solicite','media','Según orden; registrar cantidad y presentación utilizada. No convertir arpillas a kg sin equivalencia validada','operacion'),
    task('Atender apoyos extraordinarios de Sucursal antes de salir','baja','Recoger costilla, trastes u otros materiales solo cuando se solicite; indicar si no hubo solicitud','operacion'),
    task('Dejar disponibles las existencias de marinado para ROSTI','alta','El término crema de Rastro corresponde a este marinado; verificar disponibilidad según la siguiente orden, sin inventar receta ni mínimos','cierre','INSUMO'),
    task('Registrar entradas, salidas y demás movimientos de pollo del día','critica','Usar Inventario; no volver a sumar el saldo residual. La revisión de registros no equivale a conteo físico','cierre','EVIDENCIA'),
    task('Avisar a Supervisión que Rastro está listo para revisión','alta','Al terminar la orden, dejar área y registros disponibles; esperar la verificación y autorización de Supervisión antes de salir','cierre'),
    task('Dejar anotadas las actividades solicitadas para el siguiente día','media','Orden disponible para la siguiente jornada','cierre','EVIDENCIA'),
  ];
  const sucursal=[
    task('Levantar la cortina de Sucursal','alta','Responsable de apertura, aunque sea la misma persona que realiza Rastro','apertura'),
    task('Descargar e ingresar los productos trasladados','alta','Dejar la entrega disponible para la recepción verificada; no duplicar la salida de Rastro','apertura'),
    task('Retirar y llevar la basura al punto de disposición','media','Completar el retiro y regresar a Sucursal','apertura','LIMPIEZA'),
    task('Bajar las lonas y colocar las mesas','media','Mobiliario dispuesto para la apertura','apertura'),
    task('Colocar el pelotero de monedas','baja','Máquina que entrega pelotas; colocarla en su lugar de operación','apertura'),
    task('Subir y acomodar los trastes disponibles','media','Trastes colocados en sus lugares para la operación','apertura'),
    task('Limpiar y ordenar el espacio de apertura de Sucursal','media','Espacio de recepción y apertura limpio y organizado','apertura','LIMPIEZA'),
    task('Resguardar los productos después de la recepción verificada','alta','Esperar la verificación con Supervisión; guardar cada producto en su ubicación o refrigerador correspondiente','apertura'),
  ];
  const replaced=new Set(legacy.supervision.slice(0,4).map(r=>r[0]));
  const supervision=[
    task('7:00 a. m. — Llegada de Supervisión y revisión de pendientes','alta','Registrar hora real; este horario sustituye la llegada anterior de las 9:00 a. m.','apertura','PUNTUALIDAD'),
    task('7:00 a. m. — Verificar recepción contra solicitud de inventario','critica','Contar con quien entrega, cotejar solicitud y recepción, registrar diferencias y confirmar la recepción una sola vez en Inventario','apertura','EVIDENCIA'),
    task('Verificar la rutina de Apertura de Sucursal','alta','Revisar las actividades en su apartado; este control no vuelve a contabilizar cortina, mobiliario, trastes o descarga','apertura'),
    task('Revisar llegada del personal, asistencia y uniformes','media','Como parte de la apertura supervisada; registrar asistencia en su apartado','apertura'),
    task('Preparar el reporte de apertura','media','Conservar el reporte de apertura; este checklist no envía mensajes automáticamente','apertura','EVIDENCIA'),
    task('10:00 a. m. — Retomar el control de Supervisión','alta','Revisar seguimiento de operación y pendientes al regresar','operacion','PUNTUALIDAD'),
    ...legacy.supervision.filter(r=>!replaced.has(r[0])).map(row=>{
      const r=[...row];r[6]='operacion';
      if(r[0]==='6:30pm — Control de inventario final (conteo de proteínas)'){
        r[0]='6:30 p. m. — Revisión de registros de inventario final';r[4]='EVIDENCIA';
        r[5]='Revisar entradas, salidas y saldos registrados. No exige conteo físico diario; si se realiza uno, registrarlo por separado';
      }
      return r;
    }),
    task('Revisar vegetales y almacenamiento de Rastro antes de su salida','alta','Revisar papa Alfa y cambray colgadas, jalapeño y demás vegetales; reportar producto deteriorado y verificar orden del refrigerador','cierre','CALIDAD'),
    task('Verificar hielo del pollo y cámara encendida en Rastro','alta','Revisar condiciones de resguardo y productos en sus lugares; no equivale a contar las existencias','cierre','CALIDAD'),
    task('Verificar limpieza, orden y utensilios de Rastro','media','Escobas limpias, cuchillos acomodados y materiales en su área','cierre','LIMPIEZA'),
    task('Verificar insumos para la siguiente jornada de Rastro','alta','Marinado para ROSTI, leche, sal-pimienta, harina para CRUJI y vegetales según la siguiente orden; documentar faltantes','cierre','INSUMO'),
    task('Verificar los movimientos registrados de pollo antes del pase de salida','critica','Cerciorarse de que las entradas y salidas estén registradas y revisar el saldo resultante. Conteo físico únicamente cuando se realice, como verificación distinta','cierre','EVIDENCIA'),
    task('Autorizar y documentar el pase de salida de Rastro','critica','Solo después de revisar condiciones del área, insumos y registros de movimientos. Anotar responsable y hora; no requiere conteo físico diario','cierre','EVIDENCIA'),
  ];
  return {rastro,sucursal_apertura:sucursal,supervision};
}
module.exports={build};
