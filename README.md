# Hawkify — Frontend

Sitio web de Hawkify: HTML, CSS y JavaScript con módulos ES nativos, sin paso de compilación.
Consume la API del repositorio `hawkify-backend`.

## Ejecutar

Los módulos ES no cargan desde `file://`; sirve la carpeta con cualquier servidor estático:

```bash
python -m http.server 5500
```

o la extensión **Live Server** de VS Code (puerto 5500). Abre `http://localhost:5500`.

Por defecto la API se busca en `http://localhost:8080/api`. Para apuntar a otro servidor sin tocar
código, en la consola del navegador:

```js
localStorage.setItem('hawkify_api', 'https://api.tudominio.co/api')
```

En `localhost`, la pantalla de login muestra un atajo con las cuentas de demostración que siembra
el backend (contraseña `Hawkify2026*`).

## Páginas

| Página | Qué hace |
|---|---|
| `index.html` | Portada: buscador con fechas, categorías, mejor calificadas, comparador comprar vs. alquilar |
| `catalogo.html` | Filtros por texto, fechas, categoría, tarifa, calificación y marca; orden y paginación (estado en la URL) |
| `producto.html?id=` | Galería, ficha técnica, condiciones, garantía, calendario de disponibilidad real, cotización en vivo y reseñas |
| `checkout.html` | Datos del arrendatario, entrega (punto o domicilio), pago simulado con tarjeta/PSE/Nequi, cronómetro de retención y comprobante |
| `login.html`, `signup.html`, `recuperar.html`, `restablecer.html` | Autenticación, aceptación de la política de datos y recuperación de contraseña |
| `cuenta.html` | Resumen, reservas (cancelar, calificar, detalle), lista de deseos, mis herramientas (publicar con fotos), reseñas, notificaciones, perfil y direcciones, privacidad (descargar datos, eliminar cuenta) |
| `admin.html` | Panel de staff: tablero, aprobaciones, inventario y unidades, reservas (lista y calendario), usuarios y permisos, moderación, calificaciones, auditoría; y para superadmin, reportes y configuración |
| `faq.html`, `legal.html?doc=` | Ayuda y textos legales vigentes (vienen de la configuración del superadmin) |

## Estructura

```
css/style.css            sistema de diseño (tokens, componentes, páginas)
js/config.js             URL de la API y cuentas demo
js/core/api.js           cliente HTTP y errores normalizados
js/core/sesion.js        token JWT, rol y permisos
js/core/ui.js            formato COP/fechas, toasts, modales, formularios
js/core/layout.js        cabecera, notificaciones, menú de cuenta y pie
js/core/calendario.js    selector de rango sobre la disponibilidad real
js/core/formProducto.js  alta/edición de herramientas (cuenta y panel)
js/paginas/*.js          un módulo por página
assets/                  imágenes de producto y favicon
```
