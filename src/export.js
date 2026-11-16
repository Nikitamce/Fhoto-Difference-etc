function drawImage(ctx, img, transform, pixelRatio, offsetX = 0) {
  if (!img) return;
  if (transform.matrix) {
    const values = transform.matrix.match(/matrix3d\(([^)]+)\)/)?.[1].split(",").map(Number);
    if (!values) throw new Error("Perspective export is not supported");
    ctx.transform(values[0], values[1], values[4], values[5], values[12], values[13]);
  }
  ctx.translate((transform.x + offsetX) * pixelRatio, transform.y * pixelRatio);
  ctx.scale(transform.scale * pixelRatio, transform.scale * pixelRatio);
  ctx.drawImage(img, 0, 0);
}

export async function exportComparison({ viewer, modes, imgA, imgB, workspace, format }) {
  if (!imgA || !imgB) throw new Error("loadBoth");
  if (viewer.getTransformB().matrix?.startsWith("matrix3d")) throw new Error("perspective");

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(workspace.clientWidth * ratio));
  canvas.height = Math.max(1, Math.round(workspace.clientHeight * ratio));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0c0f14";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (modes.currentMode === "split") {
    const paneWidth = workspace.clientWidth / 2;
    const paneOffset = paneWidth / 2 - workspace.clientWidth / 2;
    for (const [index, img, transform] of [[0, imgA, viewer.getTransformA()], [1, imgB, viewer.getTransformB()]]) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(index * paneWidth * ratio, 0, paneWidth * ratio, canvas.height);
      ctx.clip();
      drawImage(ctx, img, transform, ratio, paneOffset);
      ctx.restore();
    }
  } else {
    drawImage(ctx, imgB, viewer.getTransformB(), ratio);
    ctx.save();
    ctx.beginPath();
    if (modes.currentMode === "slider") {
      const vertical = modes.sliderOrientation === "vertical";
      const x = vertical ? workspace.clientWidth * modes.sliderPos / 100 * ratio : 0;
      const y = vertical ? 0 : workspace.clientHeight * modes.sliderPos / 100 * ratio;
      ctx.rect(0, 0, vertical ? x : canvas.width, vertical ? canvas.height : y);
    } else {
      ctx.globalAlpha = modes.opacity;
      ctx.rect(0, 0, canvas.width, canvas.height);
    }
    ctx.clip();
    drawImage(ctx, imgA, viewer.getTransformA(), ratio);
    ctx.restore();
  }

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, `image/${format}`, 0.92));
  if (!blob) throw new Error("export");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `photocheck-comparison.${format}`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
