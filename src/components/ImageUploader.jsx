import React, { useState, useRef } from "react";
import { Box, Typography, Button } from "@mui/material";

const ImageUploader = () => {
  const [selectedFile, setSelectedFile] = useState();
  const [previewURL, setPreviewURL] = useState();

  const [pixelData, setPixelData] = useState(null);

  const fileInputRef = useRef();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
  };

  const pixelize = () => {
    if (!previewURL) return;

    const img = new Image();
    img.src = previewURL;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;

      setPixelData({ width: img.width, height: img.height, pixels: pixels });
    };
  };

  return (
    <Box>
      <input
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileSelect}
        ref={fileInputRef}
      />
      <Button variant="contained" onClick={() => fileInputRef.current.click()}>
        Upload Image
      </Button>

      {previewURL && (
        <Box mt={2} textAlign="center">
          <Typography variant="subtitle1" gutterBottom>
            Preview:
          </Typography>
          <img
            src={previewURL}
            alt="Selected"
            style={{ maxWidth: "100%", maxHeight: "300px" }}
          />
          <Button variant="contained" onClick={pixelize}>
            Pixelize
          </Button>
        </Box>
      )}

      {pixelData}
    </Box>
  );
};

export default ImageUploader;
