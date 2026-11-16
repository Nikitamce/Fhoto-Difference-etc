import exifr from "exifr";

function addRow(container, label, value) {
  const row = document.createElement("div");
  const name = document.createElement("span");
  const content = document.createElement("span");
  name.className = "meta-label";
  name.textContent = label;
  content.textContent = value;
  row.append(name, content);
  container.appendChild(row);
}

function formatExposure(value) {
  if (!value) return "—";
  return value < 1 ? `1/${Math.round(1 / value)} s` : `${value} s`;
}

export async function loadMetadata(file) {
  if (!file) return null;
  try {
    return await exifr.parse(file, { translateValues: true, reviveValues: true });
  } catch {
    return null;
  }
}

export function renderMetadata(container, file, exif, labels) {
  container.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "info-meta-grid metadata-grid";
  const camera = [exif?.Make, exif?.Model].filter(Boolean).join(" ").trim();
  addRow(grid, labels.device, camera || labels.unavailable);
  addRow(grid, labels.lens, exif?.LensModel || labels.unavailable);
  addRow(grid, labels.iso, exif?.ISO || "—");
  addRow(grid, labels.aperture, exif?.FNumber ? `f/${exif.FNumber}` : "—");
  addRow(grid, labels.exposure, formatExposure(exif?.ExposureTime));
  addRow(grid, labels.dpi, exif?.XResolution ? `${exif.XResolution} × ${exif.YResolution || exif.XResolution}` : "—");
  addRow(grid, labels.colorSpace, exif?.ColorSpace || labels.unavailable);
  addRow(grid, labels.captured, exif?.DateTimeOriginal ? new Date(exif.DateTimeOriginal).toLocaleString() : "—");
  container.appendChild(grid);
  if (!exif) {
    const note = document.createElement("p");
    note.className = "metadata-note";
    note.textContent = labels.noExif;
    container.appendChild(note);
  }
}
