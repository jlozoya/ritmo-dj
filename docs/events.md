# Archivar y eliminar eventos

En la barra del evento, el menú **Opciones del evento** permite archivar o eliminar
el evento seleccionado. El botón **Archivados**, junto a **Nuevo evento**, muestra
los eventos archivados de la cuenta y permite restaurarlos o eliminarlos.

Archivar conserva el evento, sus peticiones y su enlace de propinas. Lo retira de
la lista activa y pausa nuevas peticiones. El QR sigue mostrando que el evento ha
finalizado, sin botón de propinas. Restaurar devuelve el evento a la cabina con
las peticiones pausadas; el DJ puede abrirlas cuando lo decida.

Eliminar borra permanentemente el evento y todas sus peticiones. La interfaz
requiere escribir el nombre exacto y confirmar; el servidor verifica de nuevo el
nombre, la sesión del dueño y el origen de la solicitud. La eliminación usa un
batch transaccional de D1 para no dejar peticiones huérfanas.

La migración aditiva `0004_add-event-archive.sql` conserva los eventos existentes
como activos. Publicar la funcionalidad no archiva ni elimina datos de producción.
