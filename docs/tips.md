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

El servidor valida el proveedor y exige sesión de dueño del evento y origen
válido para cambiar el destinatario. La migración `0003_add-event-tips.sql`
añade un campo opcional; los eventos anteriores empiezan con propinas desactivadas.
