import { copyFile } from "node:fs/promises";

await copyFile(new URL("../dist/index.html", import.meta.url), new URL("../PhotoCheck_Portable.html", import.meta.url));
console.log("Portable version updated: PhotoCheck_Portable.html");
