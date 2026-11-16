// Экспорт текущего вида (режим, масштаб, положение шторки, diff) в PNG.
// Рендерит живой DOM холста через SVG <foreignObject>, поэтому повторяет то, что видно на экране.
export async function exportViewAsPng(container, mode = "view") {
  const viewport = container.querySelector(".viewport:not(.hidden)");
  if (!viewport) throw new Error("no viewport");
  const { width: W, height: H } = container.getBoundingClientRect();

  const wrap = document.createElement("div");
  wrap.id = container.id;
  wrap.className = container.className;
  wrap.setAttribute("style", `position:relative;width:${W}px;height:${H}px;overflow:hidden;background:#07080c`);
  const clone = viewport.cloneNode(true);
  clone.querySelectorAll(".curtain-handle").forEach((el) => el.remove());
  wrap.appendChild(clone);

  const keep = /viewport|img-wrapper|clipper-a|layer-|split-|viewer-container|\.hidden|^:root$/;
  let css = "";
  for (const sheet of document.styleSheets) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const r of rules) if (r.selectorText && keep.test(r.selectorText)) css += r.cssText + "\n";
  }

  const xml = new XMLSerializer().serializeToString(wrap);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%"><style><![CDATA[${css}]]></style>${xml}</foreignObject></svg>`;

  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error("render failed"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });

  // Обрезаем пустые поля: берём только область, занятую фото
  const cr = container.getBoundingClientRect();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  viewport.querySelectorAll(".img-wrapper img").forEach((im) => {
    const r = im.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    x0 = Math.min(x0, r.left - cr.left); y0 = Math.min(y0, r.top - cr.top);
    x1 = Math.max(x1, r.right - cr.left); y1 = Math.max(y1, r.bottom - cr.top);
  });
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
  const crop = x1 - x0 > 2 && y1 - y0 > 2 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: W, h: H };

  const s = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(crop.w * s);
  canvas.height = Math.round(crop.h * s);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) throw new Error("toBlob failed");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `photocheck_${mode}_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
