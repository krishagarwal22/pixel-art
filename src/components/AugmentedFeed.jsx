import { Box, Typography } from "@mui/material";
import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { convertToAscii } from "../utils/ascii";

const FONT_ASPECT = 0.77;

const AugmentedFeed = ({ width, chars }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const requestRef = useRef(null);

  const asciiRef = useRef(null);
  const textRef = useRef(null);

  const widthRef = useRef(width);
  const charsRef = useRef(chars);

  const [error, setError] = useState("");
  const [ascii, setAscii] = useState("");
  const [textScale, setTextScale] = useState(1);

  useEffect(() => {
    widthRef.current = width;
    charsRef.current = chars;
  }, [width, chars]);

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
      const currentWidth = widthRef.current;
      const currentChars = charsRef.current;

      const height = Math.floor(
        ((FONT_ASPECT * video.videoHeight) / video.videoWidth) * currentWidth
      );

      canvas.width = currentWidth;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, currentWidth, height);

      setAscii(convertToAscii(ctx, currentWidth, height, currentChars));
    }

    requestRef.current = requestAnimationFrame(asciiFrame);
  };

  const startAscii = () => {
    requestRef.current = requestAnimationFrame(asciiFrame);
  };

  useLayoutEffect(() => {
    const handleResize = () => {
      if (asciiRef.current && textRef.current) {
        const asciiWidth = asciiRef.current.offsetWidth;
        const textWidth = textRef.current.offsetWidth;

        if (textWidth > 0) setTextScale(asciiWidth / textWidth);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [ascii, width]);

  return (
    <Box>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      {error ? (
        <Typography>{error}</Typography>
      ) : (
        <Box sx={{ display: "flex", width: "100%", gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onPlay={startAscii}
              style={{ width: "100%", display: "block" }}
            />
          </Box>
          <Box
            ref={asciiRef}
            sx={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              // background: "#fff",
            }}
          >
            <pre
              ref={textRef}
              style={{
                fontFamily: "Roboto Mono, monospace",
                whiteSpace: "pre",
                fontSize: "10px",
                lineHeight: "0.8em",
                color: "#fff",
                // background: "#fff",
                margin: 0,
                padding: 0,
                transform: `scale(${textScale})`,
                transformOrigin: "top left",
                width: "fit-content",
                position: "absolute",
                top: 0,
                left: 0,
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
