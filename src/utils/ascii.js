export const convertToAscii = (ctx, width, height, chars) => {
  const levels = chars.length;

  const pixelToChar = (r, g, b, a) => {
    const alpha = a / 255;
    const color = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const brightness = color * alpha + 255 * (1 - alpha);
    const charIdx = Math.floor((brightness / 255) * (levels - 1));
    return chars[charIdx];
  };

  const pixels = ctx.getImageData(0, 0, width, height).data;

  let asciiString = "";

  for (let p = 0; p < pixels.length / 4; p++) {
    asciiString += pixelToChar(
      pixels[p * 4],
      pixels[p * 4 + 1],
      pixels[p * 4 + 2],
      pixels[p * 4 + 3]
    );

    if ((p + 1) % width == 0) {
      asciiString += "\n";
    }
  }

  return asciiString
};