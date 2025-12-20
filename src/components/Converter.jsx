import { Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { convertToAscii } from "../utils/ascii";

const Converter = ({ selectedImage }) => {
  const [ascii, setAscii] = useState("");

  useEffect(() => {
    if (!selectedImage) return;

    const chars = "Ñ@#W$9876543210?!abc;:+=-,._";

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

      const asciiString = convertToAscii(ctx, width, height, chars);

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
