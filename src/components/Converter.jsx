import { Typography } from "@mui/material";
import React, { useEffect, useState } from "react";

const Converter = ({ selectedImage }) => {
  const [ascii, setAscii] = useState("");

  useEffect(() => {
    if (!selectedImage) return;

    const chars = "Ñ@#W$9876543210?!abc;:+=-,._";
    const levels = chars.length;

    const pixelToChar = (r, g, b, a) => {
      const alpha = a / 255;
      const weightedAvg = (v) => {
        return v * alpha + 255 * (1 - alpha);
      };

      const red = weightedAvg(r);
      const green = weightedAvg(g);
      const blue = weightedAvg(b);

      const brightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
      const charIdx = Math.floor((brightness / 255) * (levels - 1));
      return chars[charIdx];
    };

    const img = new Image();
    img.src = URL.createObjectURL(selectedImage);
    img.onload = () => {
      const width = 300;
      const height = Math.floor(((0.4 * img.height) / img.width) * width);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

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

      setAscii(asciiString);
    };
  }, [selectedImage]);

  return (
    <pre
      style={{
        fontFamily: "Roboto Mono, monospace",
        whiteSpace: "pre",
        overflowX: "auto",
        fontSize: "8px",
        lineHeight: "1.6",
        color: "#fff",
        padding: "20px",
        borderRadius: "8px",
      }}
    >
      {ascii}
    </pre>
  );
};

export default Converter;
