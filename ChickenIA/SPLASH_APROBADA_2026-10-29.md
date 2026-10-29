# Arranque aprobado de ChicanIA — 29 octubre 2026

Miguel aprobó la splash en un renglón y pidió eliminar la imagen antigua que aparece al abrir desde Android. La captura enviada coincide con icons/icon-512.jpg del manifiesto; no es el logotipo corporativo del encabezado.

Cambios: se publica la splash CSS revisada con mascota aprobada, esfera/dos pulsos, frase sin tarjeta debajo de la mascota en una sola línea, entrada suave y botón Entrar ahora. Sin flechas. Íconos PNG de lanzamiento y variante maskable derivados de la misma mascota; también se sustituyeron los bytes de las rutas antiguas para no seguir sirviendo el retrato retirado. Manifiesto y favicons/touch icons apuntan a los nuevos archivos. No se cambia start_url, scope ni identidad calculada de la instalación existente.

El arranque temprano dibuja la splash antes de cargar el JavaScript diferido y evita destellos del inicio. Existe desbloqueo de seguridad, salida por teclado, imagen fallida/lenta, retorno interno sin repetir la entrada y respeto por movimiento reducido. Sin JavaScript se mantiene el inicio accesible. El service worker sigue sin interceptar ni almacenar respuestas operativas.

Límite: Android genera una pantalla estática con los iconos del manifiesto antes de ejecutar la web. No puede ejecutar esta animación allí; la animación empieza en cuanto se abre el contenido. Las instalaciones existentes pueden retener la imagen previa hasta actualizar el manifiesto/iconos; este comportamiento requiere comprobarse en el teléfono de Miguel. No afirmar validación física. No borrar almacenamiento del sitio: Pedidos conserva borradores locales.

Verificación local: prueba de activos (dimensiones PNG, destinos, fondo uniforme y manifiesto), prueba de splash 320/390/1440, frase en una línea, primer paint con script retrasado, fallos/espera, teclado y acceso sin JS; recorrido de inventario aislado API/PostgreSQL. No capturas operativas reales ni mensajes.

Prototipo HyperFrames editable: output/hyperframes/chicania-splash-2026-10-29, fuera del paquete público de la app. El funcionamiento de la app usa CSS, no un video pesado.
