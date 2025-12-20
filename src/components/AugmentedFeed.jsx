import { Box, Typography } from "@mui/material";
import React, { useRef, useState, useEffect } from "react";
import { convertToAscii } from "../utils/ascii";

const AugmentedFeed = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  const [error, setError] = useState("");
  const [ascii, setAscii] = useState("");

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Couldn't access webcam:", err);
        setError("Unable to access webcam. Please check permissions.");
      }
    };

    startWebcam();

    const video = videoRef.current;

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }

      if (video && video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();

        tracks.forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  const asciiFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === 4) {
      const width = 1000;
      const height = Math.floor(
        ((0.4 * video.videoHeight) / video.videoWidth) * width
      );

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, width, height);

      setAscii(convertToAscii(ctx, width, height));
    }

    requestRef.current = requestAnimationFrame(asciiFrame);
  };

  const startAscii = () => {
    requestRef.current = requestAnimationFrame(asciiFrame);
  };

  return (
    <Box>
      {error ? (
        <Typography>{error}</Typography>
      ) : (
        <Box sx={{ display: "flex", width: "100%" }}>
          <Box sx={{ flex: 1 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlay={startAscii}
              sx={{ flex: 1 }}
              style={{ width: "100%" }}
            />
          </Box>
          <Box sx={{ flex: 0 }}>
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <pre
              style={{
                fontFamily: "Roboto Mono, monospace",
                whiteSpace: "pre",
                overflowX: "auto",
                fontSize: "8px",
                color: "#000",
                background: "#fff",
                padding: "20px",
                borderRadius: "8px",
                width: "100%",
              }}
            >
              {ascii}
            </pre>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AugmentedFeed;
