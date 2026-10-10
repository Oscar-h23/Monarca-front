# Monarca Front — Angular 20 / TypeScript / Tailwind CSS v4

Migración del frontend HTML/CSS/JS del [repositorio Monarca original](https://github.com/jpumaricradgjdgp-cyber/Monarca_herramientas_de_desarrollo) al proyecto independiente de Angular.

## Stack
- Angular 20, componentes standalone y TypeScript estricto
- Angular Router y HttpClient
- Tailwind CSS v4 mediante `@tailwindcss/postcss`
- Estado de carrito con signals; persistencia en `localStorage`

## Ejecutar en desarrollo
Requisitos: Node.js compatible con Angular 20, Java 21 y el [backend Monarca](https://github.com/Oscar-h23/Monarca-back/tree/develop).

```bash
npm install
npm start -- --proxy-config proxy.conf.json
```

Accede a `http://localhost:4200`. El proxy envía `/api` a `http://localhost:8080`. El backend requiere PostgreSQL y variables de entorno; no se crean datos de ejemplo.

## Rutas
- `/`: inicio, colecciones y productos recomendados
- `/catalogo/:categoria`: tops, bottoms, calzado y accesorios con filtros
- `/producto/:id`: detalle y selección de variante
- `/carrito`: bolsa y cantidades con validación de stock
- `/checkout`: registro de pedido autenticado
- `/login`: login, registro y recuperación/restablecimiento por correo
- `/admin`: CRUD de productos/variantes y lectura de pedidos
- `/contacto`: formulario de redacción en cliente de correo (no hay endpoint de contacto en el backend original)
- `/nosotros`: historia, valores y equipo

## Seguridad y límites
- Un rol leído desde localStorage solo sirve para controlar visibilidad; **el backend debe autenticar y autorizar cada solicitud**.
- Las imágenes originales aún se cargan, según disponibilidad, desde la ruta pública de GitHub del proyecto fuente; se migrarán progresivamente a `public/img`.
- Contrato de backend conservado sin modificaciones de esquema; se requiere BD original.
- Los datos de reportes son pedidos reales obtenidos de `GET /api/pedidos` (el total de pedidos no es facturación).
- No hay pasarela de pago integrada: el backend registra un pedido con estado de pago pendiente.
- Antes de producción se deben probar flujos completos, ajustar CORS y configurar URL del frontend para los enlaces de recuperación (`PASSWORD_RESET_URL=http://localhost:4200/login` en desarrollo).

## Integración continua
GitHub Actions ejecuta `npm install` y `npm run build` en pushes a `develop` o `main`.
