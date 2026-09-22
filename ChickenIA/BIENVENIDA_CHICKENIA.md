# Bienvenida de ChickenIA

Miguel aprobó usar la mascota proporcionada en una bienvenida dentro de la app,
conservando el icono instalado. Después pidió mostrarla uno o dos segundos y añadir
una barra animada para apreciar la mascota.

- `index.html` muestra la bienvenida al cargar Inicio, después del arranque nativo.
- Imagen original con transparencia real: `icons/welcome-mascot.png`, copiada sin
  cambios de `09-INFO CHICANITO Ai/imagenes-catalogo/mascota sin fondo.png`.
- Dos segundos desde que la imagen está lista; barra decorativa y texto
  «Preparando ChickenIA…». No afirma conectarse ni actualizar datos.
- «Entrar ahora» permite omitirla. No aparece entre módulos ni vuelve a bloquear
  Inicio cuando el navegador restaura una página anterior.
- Fallos de imagen o script dejan entrar. Tiempo máximo de espera: 4.5 segundos.
- Respeta reducción de movimiento; el contenido del Inicio queda fuera del foco
  mientras se muestra la bienvenida y se libera al terminar.
- `manifest.json` y los iconos 32, 180, 192 y 512 permanecen idénticos. Android puede
  seguir mostrando brevemente su pantalla de arranque basada en el icono instalado;
  esta bienvenida no la sustituye ni puede personalizarla por separado.

Archivos: `css/welcome.css`, `js/welcome.js`, `index.html` e imagen. El build existente
copia estos recursos a `public/` sin cambios de configuración.

Validación local: duración medida de aproximadamente 2000 ms, anchos 390/1280,
horizontal 640x360, omisión manual, reducción de movimiento, imagen fallida/lenta,
script fallido y JavaScript deshabilitado. Se compararon los iconos y manifest con
Git y la nueva mascota con el archivo original: sin alteraciones.
Capturas en `test/results/welcome/`. Para capturar una pantalla de solo dos segundos
se prolongaron los temporizadores únicamente en el navegador de la vista previa;
la comprobación de duración utilizó el código real sin esa modificación.
