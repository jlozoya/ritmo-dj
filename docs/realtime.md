# Actualización de la cabina

La cabina usa Ably por WebSocket. Cada evento tiene su canal privado
`ritmo:event:<id>`. Solo el DJ propietario puede obtener un JWT para ese canal,
con permiso Subscribe y caducidad de cinco minutos. El cliente renueva el token
con su sesión de Ritmo. La clave completa nunca se entrega al navegador.

Después de guardar una petición, un cambio de estado, un clic de propina o una
modificación del evento, el servidor publica un aviso sin datos personales ni
contenido de canciones. La cabina obtiene los datos actualizados desde su API.
Los mensajes rápidos se agrupan y las lecturas se ejecutan en serie. Al cambiar
de evento o cerrar la cabina se cierran la conexión y los temporizadores.

## Respaldo y cuotas

- Hasta que el canal esté conectado y suscrito, se consulta la API cada 3 s.
- Una desconexión, rechazo de autenticación o límite de conexiones/canales
  mantiene activo ese respaldo. Los fallos terminales se reintentan cada 30 s.
- Un rechazo al publicar, incluidos HTTP 429 o bloqueo de cuenta por cuota,
  guarda una pausa de 60 s en D1 para ese evento. Así las distintas instancias
  del servidor comparten el fallo y no insisten por cada petición.
- Incluso con un socket conectado hay una lectura de seguridad cada 15 s.
  Detecta fallos al publicar que no hayan desconectado al suscriptor; al ver la
  pausa guardada en D1, la cabina vuelve a las consultas cada 3 s.
- Cuando Ably y la API se recuperan, vuelve a «En vivo» y refresca la lista para
  recuperar los cambios ocurridos durante la desconexión. Las peticiones se
  guardan en D1 aunque Ably falle.

La pantalla pública conserva su consulta cada 10 s para recibir pausas y cambios
del enlace de propinas sin consumir una conexión Ably por invitado.

## Configuración

En Ably, crea una **aplicación** y una **API key de la aplicación**, con Publish
y Subscribe. No se necesita un token de administración de la cuenta. Limita los
canales de esa clave a `ritmo:event:*` si el panel ofrece ese campo.

En local, guarda `ABLY_API_KEY` en `.dev.vars` y reinicia el servidor. En Sites,
configura esa misma variable como **secreto** y publica una versión para aplicar
la nueva revisión del entorno. No se copia `.dev.vars` al sitio ni a GitHub.
Sin clave, las consultas cada 3 s siguen funcionando.

## Validación

`bun run test` comprueba firma y permisos de los JWT, fallos de publicación,
cuota, pausa persistida, reconexión, lecturas en serie y limpieza. Con el servidor
local en el puerto 5184 y una clave válida, `RITMO_TEST_ABLY=1 bun run test:auth`
añade una recepción real por WebSocket con un evento desechable. Las pruebas
simulan los límites; no agotan la cuota real de la cuenta.
