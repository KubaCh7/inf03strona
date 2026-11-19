// Zastepuje @php-wasm/web-X-Y: zawsze jedna wersja PHP (8.2, jak w XAMPP) w wariancie asyncify (dziala w kazdej przegladarce).
// Dzieki temu do paczki trafia jeden plik .wasm zamiast kilkudziesieciu.
export async function getPHPLoaderModule() {
  // @ts-expect-error modul JS bez typow
  return await import('../../../node_modules/@php-wasm/web-8-2/asyncify/php_8_2.js');
}
export async function getIntlExtensionPath(): Promise<string> {
  throw new Error('intl nie jest dostępne w tej wersji');
}
export async function jspi() { return false; }
