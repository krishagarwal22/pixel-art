import React, { useState, useRef } from "react";
import { Box, Typography, Button } from "@mui/material";

const ImageUploader = () => {
  const [selectedFile, setSelectedFile] = useState();
  const [previewURL, setPreviewURL] = useState();

  const fileInputRef = useRef();

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewURL(URL.createObjectURL(file));
    }
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
        </Box>
      )}
    </Box>
  );
};

export default ImageUploader;
