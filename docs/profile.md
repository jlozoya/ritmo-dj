# Perfil del DJ

La ruta `/perfil` requiere sesión y está disponible desde el menú **Perfil** de
la cabina. Permite cambiar el nombre del DJ y consultar el correo de acceso.
El correo se muestra como solo lectura; no se altera la identidad de la cuenta.

El cambio de contraseña requiere la contraseña actual, una nueva de entre 8 y
128 caracteres y su confirmación. Better Auth valida el cambio en el servidor,
cierra las demás sesiones y mantiene la sesión del dispositivo actual.

Las pruebas de integración cubren permisos, origen, persistencia del nombre,
contraseña actual incorrecta, longitud mínima, revocación de otras sesiones e
inicio de sesión con la contraseña nueva. Se ejecutan con cuentas locales
desechables, sin modificar cuentas de producción.
