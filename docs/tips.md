# Propinas por evento

En la cabina, la tarjeta **Propinas** permite guardar un enlace de pago para el
evento seleccionado. El público verá **Dejar propina** junto al formulario y
después de enviar una canción, incluso si las peticiones están pausadas.
El DJ puede cambiar el enlace o pulsar **Desactivar** para ocultar el botón.

Se admiten estos formatos HTTPS:

- `https://paypal.me/tuusuario`
- `https://www.paypal.com/paypalme/tuusuario`
- `https://mpago.la/codigo`
- `https://link.mercadopago.com.mx/tuusuario`

Cada DJ debe crear su enlace en su propia cuenta de la plataforma. La tarjeta
incluye accesos a [PayPal.Me](https://www.paypal.com/paypalme/) y a
[Link de pago de Mercado Pago](https://www.mercadopago.com.mx/herramientas-para-vender/link-de-pago).
El importe y los medios de pago dependen del enlace y de la plataforma; en
Mercado Pago, configura el importe en el enlace si tu modalidad lo requiere.

El pago se abre en otra pestaña, directamente en la plataforma. Ritmo no procesa
tarjetas, no recibe el dinero y no guarda credenciales de pago. Las comisiones
y condiciones son las de la cuenta del DJ en esa plataforma.

Esta integración usa enlaces de pago: no requiere claves API ni webhooks. Ritmo
no confirma pagos ni modifica el orden de las peticiones por abrir el enlace.
El DJ consulta los cobros en su cuenta de PayPal o Mercado Pago.

Al pulsar **Dejar propina**, Ritmo registra una apertura por navegador y evento,
sin esperar la respuesta para abrir la plataforma. La tarjeta Propinas de la
cabina muestra **aperturas del enlace** y las solicitudes de ese navegador
muestran **Abrió enlace de propina**, también si se enviaron antes del clic.
Los clics repetidos no aumentan el contador. No se registran aperturas de
enlaces guardados fuera de Ritmo ni visitas anteriores a esta función.

El indicador no confirma el pago ni el importe y no da prioridad a las canciones.
La asociación usa el identificador anónimo ya empleado para las peticiones;
cambiar de navegador o borrar su almacenamiento crea otra identidad. Los
totales son privados para el DJ y se conservan al pausar, archivar o desactivar
las propinas. La migración `0005_track-tip-openings.sql` añade estos registros.

El servidor valida el proveedor y exige sesión de dueño del evento y origen
válido para cambiar el destinatario. La migración `0003_add-event-tips.sql`
añade un campo opcional; los eventos anteriores empiezan con propinas desactivadas.
