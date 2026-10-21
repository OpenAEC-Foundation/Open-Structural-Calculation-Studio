/**
 * CalcPAD #include resolution table. Files referenced via `#include name.cpd`
 * in a calc source are looked up here and inlined at parse time.
 *
 * Add new entries by importing the raw file content via Vite's `?raw` suffix.
 */

export const calcpadIncludes: ReadonlyMap<string, string> = new Map();

/**
 * Raster images referenced inline via `<img src="./Images/Picture0.png">`.
 * Looked up by basename (case-insensitive) at parse time.
 */
export const calcpadImageUrls: ReadonlyMap<string, string> = new Map();
