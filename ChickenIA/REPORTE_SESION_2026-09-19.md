# Cierre de sesión — 19 septiembre 2026

## Estado publicado

Último commit funcional `e690a4d` — `Fix daily report themes and organize supervision controls`.
Incluye la implementación inicial de informes del commit `05d4a4f`.
Push a `origin/main` completado. Dominio: https://chickenia.chicanito.app.
Raíz Git: `C:/Users/hp/Desktop/CHICANITO/02-OPERACION`; raíz de Vercel: `ChickenIA`.

Comprobación después del push: `/rastro.html` respondió HTTP 200 y contenía
«Inventario de Rastro»; `/js/supervision.js` contenía `daily-reports`.
`/supervision.html` respondió HTTP 200. La primera consulta de esa página fue
anterior a que aparecieran los enlaces nuevos; después se comprobó el código nuevo.
Esto confirma publicación de archivos, no una captura autenticada contra Neon.

## Ajustes finales publicados y verificados

- Tres botones independientes al final de Supervisión: Cierre de Caja,
  Producción Diaria e Inventario de Rastro. Permanecen visibles al cambiar de área en Jojutla.
- Modo día/noche compartido con los formularios; corregido el fondo blanco fijo
  que dejaba texto claro ilegible. Caja y Producción ya no comparten pestañas.
- Puntos de control del día colapsables; recuerdan su estado en el dispositivo.
- Eventos de acordeón limitados al checklist para evitar manejadores duplicados en Asistencia.
- Verificación móvil de 390 px y escritorio, navegación y contraste de botones en
  ambos modos, incluyendo controles activos y deshabilitados. Sin desbordamiento horizontal
  en las vistas móviles revisadas. Las 13 pruebas de captura e inventario pasaron.
- Producción confirmó `DETAILS` para los puntos de control, los tres enlaces después
  del checklist y el CSS actualizado. No se guardaron datos reales durante esta revisión.

## Acuerdos que no se deben volver a levantar

- Regresar a captura digital en ChickenIA, dentro de Supervisión y Asistencia:
  Cierre de Caja, Producción Diaria e Inventario de Rastro.
- Formularios amigables, en lista. Evitar prototipos largos, preguntas repetitivas
  y consumo innecesario de tokens. Trabajar sobre la revisión concreta de Miguel.
- TODO pollo debe capturarse en piezas: 8 piezas = 1 pollo entero, crudo y cocido,
  Cruji y Rosti. La implementación nueva aplica esta regla en Producción Diaria.
- Rastro: existencia anterior + entradas − salidas = existencia final. Movimientos
  por fecha, historial semanal y arrastre del saldo; no columnas fijas en la base.
- Porciones de alimentos en kg; artículos de limpieza/utensilios conservan su unidad.
- Miguel pidió terminar commit/push, confirmar producción y parar. Posteriormente
  autorizó actualizar documentación para retomar ajustes en la siguiente sesión.

## Implementación y datos

Consultar [INFORMES_DIGITALES.md](INFORMES_DIGITALES.md) para rutas, validación y tablas.
Caja usa `cash_close_daily_live` y su historial; producción usa
`production_daily_live` y su historial. Rastro reutiliza `locations`,
`inventory_items`, `inventory_movements`; no se crearon tablas nuevas de Rastro.

Miguel ejecutó en Neon el SQL de alta de ubicación `rastro` y productos `RAS-001`
a `RAS-012`, y confirmó «Statement executed successfully». El SQL no cargó saldos.
El esquema exportado queda en `../../12-CHICKENIA.NEON/` desde esta carpeta.
El inventario nuevo de Rastro es independiente del motor anterior `inv_state`.

Referencias de formato en
`../../10-CHATGPT-PROYECTOS/04-FORMATOS-PRODUCCION-Y-CIERRE/01-ENTREGABLES/`:
`Chicken_Chicanito_Produccion_Letra_Grande.pdf` y
`Chicken_Chicanito_Cierre_Diario_Una_Pagina.pdf`.

## Verificación realizada

18 pruebas aprobadas de caja, producción, Rastro y Telegram; build correcto.
Navegador contra PostgreSQL local aislado: guardado de Rastro con 10 + 5 − 3 = 12,
producción cruda/cocida en piezas y conteo de caja de $23,203.
Pruebas cubren saldo desconocido, arrastre, salida excesiva, escritura retroactiva,
reintento duplicado, sesión/rol/origen y conversión de pollos a piezas una sola vez.
No se cargaron datos ficticios en Neon ni se enviaron Telegram de prueba.

## Próxima sesión: ajustes pendientes, todavía no realizados

1. Recibir nuevos ajustes de Miguel; los cambios de tema, botones y sección colapsable
   ya están publicados. Comprobar el acceso y primer guardado real de Rastro con su sesión;
   no inventar saldos.
2. Completar la regla de piezas en las pantallas antiguas de inventario/abastecimiento:
   `lib/inventory-domain.js` aún define artículos en `pollos`; no afirmar que todo el
   motor anterior ya fue migrado. Cuidar saldos, recetas, conversiones e historial.
3. Revisar la mezcla «sal-pimienta»: el SQL previo reutilizó Sal y Pimienta separadas,
   pero el catálogo operativo anterior menciona una mezcla de la casa. No equipararlas
   automáticamente. Revisar también las unidades y productos con Miguel al ajustar.
4. Revisar lectura de semanas completas si crece el historial: la respuesta de Rastro
   conserva los últimos 200 movimientos hasta la fecha y el navegador filtra la semana.
5. La UI guarda con botones y al cambiar de paso en captura diaria; no se implementó
   autoguardado continuo. No prometerlo como disponible.

## Captura real previa del 18 de septiembre

En esta conversación se verificó caja como borrador versión 4 y proteínas versión 6,
sin finalizar, antes de cambiar al formato digital. Gastos corregidos por Miguel a
$0; tarjeta $767; transferencia $107. Sobrante Cruji: 9 piezas.
El sobrante Rosti de 3.75 pollos quedó solo en aclaraciones porque la versión anterior
lo rechazaba; el campo numérico quedó pendiente. Ahora equivale a 30 piezas, pero
NO se rellenó ese campo real al desplegar. La conversión no extrae cantidades de notas.
Miguel ordenó parar la captura: no reabrirla ni completarla automáticamente.

## Estado del workspace al cerrar

Ya existían cambios ajenos al commit funcional en las skills fuente de cierre-caja
y `../Formatos-Internos/`; preservarlos. El handoff tenía actualizaciones previas
que se conservaron como histórico. Los README del workspace superior están fuera
de este repositorio Git. Esta actualización documental no modifica la aplicación.

Node disponible si no está en PATH:
`C:/Users/hp/AppData/Local/Programs/Python312/Lib/site-packages/playwright/driver/node.exe`.
No reutilizar la prueba local `.local/report-preview.cjs` para operación real:
usa PostgreSQL aislado y un usuario de prueba; no es un servidor de producción.
El servidor temporal de verificación quedó detenido. Documentación de cierre guardada
en esta carpeta; los cambios documentales locales y las modificaciones previas de skills
y formatos permanecen separados del commit funcional. Sesión cerrada por instrucción de Miguel.
