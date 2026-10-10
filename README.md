# Monarca Front — Angular + TypeScript + Tailwind CSS

Frontend separado del repositorio [Monarca_herramientas_de_desarrollo](https://github.com/jpumaricradgjdgp-cyber/Monarca_herramientas_de_desarrollo).

## Ejecutar

Requiere Node.js compatible con Angular 20.

```bash
npm install
npm start -- --proxy-config proxy.conf.json
```

El backend Spring Boot original debe estar disponible en `http://localhost:8080`.

## Migración inicial

- Angular standalone, enrutamiento SPA y TypeScript estricto.
- Tailwind CSS v4 con PostCSS.
- Inicio, categorías, búsqueda/filtros, detalle de producto y selección de variante, carrito persistente, checkout conectado al contrato API existente, login/registro/recuperación, páginas informativas y tabla inicial de inventario.
- Se conservan las rutas esperadas de la API y las claves de sesión del proyecto original.
- Los recursos gráficos se cargan temporalmente desde `raw.githubusercontent.com` del repositorio público original: **no se copiaron aún las imágenes al nuevo repo**.
- **Pendiente:** migrar CRUD completo de administración, reportes, recuperación/restablecimiento completos, formulario de contacto y revisión funcional integral contra backend. No considerar esta rama equivalente a la versión HTML existente hasta completar pruebas.
- Autorización: verificar roles y permisos también del lado del servidor. El guard visual no sustituye autorización del backend.

## Ramas

`main` contiene la inicialización; la migración vive en `develop`.
