import { renderSVG } from "uqr";

export function qrSvg(text: string, size = 180) {
  const svg = renderSVG(text, {
    pixelSize: 8,
    whiteColor: "#ffffff",
    blackColor: "#111827",
  });
  return svg.replace("<svg ", `<svg width="${size}" height="${size}" `);
}

export function qrSvgDataUri(text: string, size = 180) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg(text, size))}`;
}
