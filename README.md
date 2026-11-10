# Monarca Front — Angular 20 / TypeScript / Tailwind CSS v4

**Arquitectura modular**: rutas lazy-loaded, servicios de API/carrito/sesión compartidos, layout y páginas por funcionalidad. Ver [ARCHITECTURE.md](ARCHITECTURE.md).

Migración del frontend HTML/CSS/JS del [repositorio Monarca original](https://github.com/jpumaricradgjdgp-cyber/Monarca_herramientas_de_desarrollo) al proyecto independiente de Angular.

## Stack
- Angular 20, componentes standalone y TypeScript estricto
- Angular Router y HttpClient
- Tailwind CSS v4 mediante `@tailwindcss/postcss`
- Estado de carrito con signals; persistencia en `localStorage`

## Ejecutar en desarrollo
Requisitos del frontend: Node.js 22.12 o superior dentro de la rama 22 (la misma que usa GitHub Actions) y npm. El archivo `.nvmrc` selecciona Node 22 si usas nvm:

```bash
nvm install
nvm use
```

Angular 20 también admite Node `^20.19.0` y `^24.0.0`; Node 26 no está soportado. Ver la [tabla oficial de compatibilidad](https://angular.dev/reference/versions).

Después instala las dependencias e inicia el servidor:

```bash
npm install
npm start
```

Espera a que Angular muestre `Local: http://localhost:4200/` y deja la terminal abierta. El backend no es necesario para compilar o iniciar el frontend; sí se necesita para cargar productos, iniciar sesión y registrar pedidos. Para esas funciones, ejecuta el [backend Monarca](https://github.com/Oscar-h23/Monarca-back/tree/develop) con Java 21 en el puerto 8080.

Accede a `http://localhost:4200`. El proxy de desarrollo se activa automáticamente con `npm start` (opción `serve.options.proxyConfig` en `angular.json`) y envía `/api` a `http://localhost:8080`. Para verificar la conexión, abre `http://localhost:4200/api/productos`: debe responder JSON. Si todavía no hay productos en MonarcaDB, devolverá `[]` sin error. El backend requiere PostgreSQL y variables de entorno; no se crean datos de ejemplo.

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
- Se han copiado **60 imágenes** (logos y miniaturas de productos) a `public/img`; los banners e imágenes grandes continúan temporalmente desde GitHub del proyecto fuente.
- Google y el recomendador de tallas requieren la migración adicional del backend; no basta con desplegar el frontend.
- Los datos de reportes son pedidos reales obtenidos de `GET /api/pedidos` (el total de pedidos no es facturación).
- No hay pasarela de pago integrada: el backend registra un pedido con estado de pago pendiente.
- Antes de producción se deben probar flujos completos, ajustar CORS y configurar URL del frontend para los enlaces de recuperación (`PASSWORD_RESET_URL=http://localhost:4200/login` en desarrollo).

## Integración continua
GitHub Actions ejecuta `npm install` y `npm run build` en pushes a `develop` o `main`.


## Acceso con Google y medidas de tallas

La ruta `/login` incorpora el botón oficial Google Identity Services. El frontend obtiene su Client ID público desde `GET /api/auth/google/configuracion` y envía el ID token a Spring Boot para validación y emisión del JWT habitual. **No se almacena ni se verifica el token de Google como sesión del sitio.** El backend debe tener `GOOGLE_WEB_CLIENT_ID` configurado y Google Cloud debe permitir el origen del frontend, incluido `http://localhost:4200` en desarrollo.

En `/perfil` el usuario puede vincular Google a su cuenta existente y guardar opcionalmente busto, cintura, cadera y estatura en centímetros.

En `/admin` se registran medidas diferentes para cada variante/talla: pecho, cintura, cadera y largo de prenda. Son **contornos completos** (no ancho en plano). La ficha `/producto/:id` muestra esas medidas y, para Tops y Bottoms, recomienda una talla cuando encuentra una coincidencia con al menos 2 cm de holgura en cada dimensión comparable. Si faltan datos o no hay stock no se muestra una talla inventada.

El cambio requiere ejecutar `db/migrations/20261110_google_login_medidas.sql` del backend **antes** de activar el backend actualizado y comprobar los flujos extremo a extremo.
