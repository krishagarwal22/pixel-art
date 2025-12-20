import { Box, Typography } from "@mui/material";
import React, { useRef, useState, useEffect } from "react";

const AugmentedFeed = () => {
  const videoRef = useRef(null);
  const [error, setError] = useState("");

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
      if (video && video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();

        tracks.forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return (
    <Box>
      {error ? (
        <Typography>{error}</Typography>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%" }}
        />
      )}
    </Box>
  );
};

export default AugmentedFeed;
