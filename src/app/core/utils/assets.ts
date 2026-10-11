import { localAssetPaths } from './local-assets';

/** Utiliza una copia local cuando existe y mantiene temporalmente el origen legado. */
const LEGACY_ASSETS = 'https://raw.githubusercontent.com/jpumaricradgjdgp-cyber/Monarca_herramientas_de_desarrollo/main/fronted/img/';

export function asset(path: string): string {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  return (localAssetPaths.has(path) ? '/img/' : LEGACY_ASSETS) + encoded;
}
