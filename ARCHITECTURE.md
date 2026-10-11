# Arquitectura del frontend Monarca

## Principios
- **Standalone + lazy routes:** una pantalla = una unidad funcional de carga diferida.
- **Core:** modelos del contrato REST, acceso a API, estado global de carrito y sesión, rutas protegidas por UX.
- **Layout:** cabecera, navegación y pie compartidos.
- **Features:** cada funcionalidad concentra su componente y plantilla.
- **Supabase:** el frontend nunca conecta directamente a PostgreSQL; toda operación de datos usa `/api` y el backend Spring Boot.

## Estructura

```text
src/app/
  app.routes.ts
  core/
    guards/access.guards.ts
    models/shop.models.ts
    services/api.service.ts
    services/cart.service.ts
    services/session.service.ts
    utils/assets.ts
    utils/local-assets.ts
  layout/
    shell.component.ts
  features/
    home/home.page.ts
    catalog/catalog.page.ts
    product/product.page.ts
    cart/cart.page.ts
    checkout/checkout.page.ts
    auth/{auth.page.ts,auth.html}
    admin/{admin.page.ts,admin.html}
    contact/{contact.page.ts,contact.html}
    about/{about.page.ts,about.html}
```

## Límites de responsabilidades
1. **Componentes:** presentación, formularios y estado de página. No deben conocer el host de Spring Boot.
2. **Api:** único cliente HTTP de catálogo, login y pedidos. La administración aún llama directamente a `HttpClient` para operaciones avanzadas; se puede extraer a `AdminApi` en una segunda fase.
3. **SessionService:** centraliza las claves de `localStorage` existentes. Los guardias de rutas solo mejoran la navegación; **la seguridad real se aplica en Spring Security**.
4. **Cart:** mantiene señales y persistencia de carrito previas sin cambiar el contrato de pedidos.
5. **Assets:** primero rutas locales `public/img`; temporalmente algunos banners siguen vinculados al repositorio de origen.

## Ejecución y verificación

```bash
npm install
npm start
npm run build
```

`angular.json` configura automáticamente el proxy de desarrollo `/api` hacia `http://localhost:8080`. La API pública `/api/productos` debería responder `[]` cuando la base esté vacía.

## Pendiente antes de producción
- Tests funcionales de login, compra y CRUD de productos contra MonarcaDB.
- Mover todos los banners del repositorio original y actualizar los datos de contacto oficiales.
- Considerar almacenar JWT en una estrategia de sesión más resistente a XSS; nunca usar el rol del navegador para autorizar operaciones.
- Extraer operaciones de inventario y pedidos del componente admin a servicios `core`.
