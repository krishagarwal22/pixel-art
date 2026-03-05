import { Box, Typography } from "@mui/material";
import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { convertToAscii } from "../utils/ascii";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

const FONT_ASPECT = 0.77;

// Performance tuning:
// - Hand detection is relatively heavy; run at a fixed interval.
// - ASCII conversion is very heavy; run at a lower fixed FPS to avoid UI choppiness.
const HAND_DETECT_INTERVAL_MS = 55; // ~18 fps
const ASCII_INTERVAL_MS = 70; // ~14 fps

// Sensitivity defaults: lower max => "closer" sooner (more sensitive).
const DEFAULT_MIN_AREA = 0.01;
const DEFAULT_MAX_AREA = 0.12;

// Auto-mapping tweaks: boost/curve closeness so resolution drops sooner.
const CLOSENESS_BOOST = 1.8;
const CLOSENESS_GAMMA = 0.85; // < 1 => more sensitive in mid-range

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // index
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // middle
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // ring
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // pinky
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;

const AugmentedFeed = ({
  width,
  chars,
  autoResolutionEnabled = false,
  onAutoAsciiWidth,
  autoAsciiWidthRange,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const requestRef = useRef(null);

  const asciiRef = useRef(null);
  const textRef = useRef(null);

  const widthRef = useRef(width);
  const charsRef = useRef(chars);

  const [error, setError] = useState("");
  const [handError, setHandError] = useState("");
  const [ascii, setAscii] = useState("");
  const [textScale, setTextScale] = useState(1);
  const [handInfo, setHandInfo] = useState({
    status: "loading",
    closeness: null,
    distance: null,
  });

  const handStatusRef = useRef(handInfo.status);
  const handErrorRef = useRef(handError);
  const autoResolutionEnabledRef = useRef(autoResolutionEnabled);
  const onAutoAsciiWidthRef = useRef(onAutoAsciiWidth);
  const autoAsciiWidthRangeRef = useRef(autoAsciiWidthRange);

  const handLandmarkerRef = useRef(null);
  const lastHandDetectMsRef = useRef(0);
  const lastHandSeenMsRef = useRef(0);
  const lastHandResultRef = useRef(null);
  const handMetricsRef = useRef({ closeness: null, distance: null });
  const minAreaRef = useRef(Number.POSITIVE_INFINITY);
  const maxAreaRef = useRef(Number.NEGATIVE_INFINITY);
  const smoothedAsciiWidthRef = useRef(null);
  const lastAutoEmitMsRef = useRef(0);
  const lastAutoEmittedValueRef = useRef(null);
  const lastAsciiMsRef = useRef(0);

  useEffect(() => {
    widthRef.current = width;
    charsRef.current = chars;
  }, [width, chars]);

  useEffect(() => {
    handStatusRef.current = handInfo.status;
    handErrorRef.current = handError;
  }, [handInfo.status, handError]);

  useEffect(() => {
    autoResolutionEnabledRef.current = autoResolutionEnabled;
    onAutoAsciiWidthRef.current = onAutoAsciiWidth;
    autoAsciiWidthRangeRef.current = autoAsciiWidthRange;
  }, [autoResolutionEnabled, onAutoAsciiWidth, autoAsciiWidthRange]);

  useEffect(() => {
    let cancelled = false;

    const initHands = async () => {
      try {
        const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
        const wasmBase = `${base}mediapipe/wasm/`;
        const modelPath = `${base}mediapipe/models/hand_landmarker.task`;

        const vision = await FilesetResolver.forVisionTasks(wasmBase);
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: modelPath,
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        if (cancelled) {
          landmarker?.close?.();
          return;
        }

        handLandmarkerRef.current = landmarker;
        setHandInfo((prev) => ({ ...prev, status: "ready" }));
      } catch (err) {
        console.error("Failed to init hand tracking:", err);
        if (!cancelled) {
          setHandError(
            "Hand tracking failed to load. Run npm install to fetch assets (or check network), then restart dev server."
          );
          setHandInfo((prev) => ({ ...prev, status: "error" }));
        }
      }
    };

    initHands();

    return () => {
      cancelled = true;
      try {
        handLandmarkerRef.current?.close?.();
      } catch {
        // ignore
      }
      handLandmarkerRef.current = null;
    };
  }, []);

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

  const syncOverlayCanvas = () => {
    const video = videoRef.current;
    const overlay = overlayCanvasRef.current;
    if (!video || !overlay) return null;

    const w = video.clientWidth;
    const h = video.clientHeight;
    if (!w || !h) return null;

    const dpr = window.devicePixelRatio || 1;
    const desiredW = Math.floor(w * dpr);
    const desiredH = Math.floor(h * dpr);
    if (overlay.width !== desiredW || overlay.height !== desiredH) {
      overlay.width = desiredW;
      overlay.height = desiredH;
    }

    const ctx = overlay.getContext("2d");
    if (!ctx) return null;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  };

  const drawOverlay = (now) => {
    const synced = syncOverlayCanvas();
    if (!synced) return;

    const { ctx, w, h } = synced;
    ctx.clearRect(0, 0, w, h);

    const status = handStatusRef.current;
    const initErr = handErrorRef.current;
    if (status !== "ready") {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8, 8, 320, 44);
      ctx.fillStyle = "#fff";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText(
        status === "error"
          ? `Hand: error (see message below)`
          : "Hand: loading…",
        16,
        28
      );
      if (status === "error" && initErr) {
        // keep overlay minimal; full message is rendered below the video
      }
      return;
    }

    const lastSeen = lastHandSeenMsRef.current;
    const isRecent = now - lastSeen < 600;
    const result = lastHandResultRef.current;

    if (!isRecent || !result?.landmarks?.length) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(8, 8, 220, 44);
      ctx.fillStyle = "#fff";
      ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
      ctx.fillText("Hand: not detected", 16, 28);
      return;
    }

    const landmarks = result.landmarks[0];

    let minX = 1,
      minY = 1,
      maxX = 0,
      maxY = 0;
    for (const p of landmarks) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const closeness = handMetricsRef.current.closeness ?? 0;
    const distance = handMetricsRef.current.distance ?? 0;

    const boxX = minX * w;
    const boxY = minY * h;
    const boxW = (maxX - minX) * w;
    const boxH = (maxY - minY) * h;

    const nearColor = { r: 255, g: 90, b: 90 };
    const farColor = { r: 100, g: 220, b: 120 };
    const mix = (a, b, t) => Math.round(a + (b - a) * t);
    const r = mix(farColor.r, nearColor.r, closeness);
    const g = mix(farColor.g, nearColor.g, closeness);
    const b = mix(farColor.b, nearColor.b, closeness);

    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgb(${r} ${g} ${b})`;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // connections
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
    ctx.beginPath();
    for (const [a, c] of HAND_CONNECTIONS) {
      const p1 = landmarks[a];
      const p2 = landmarks[c];
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
    }
    ctx.stroke();

    // points
    ctx.fillStyle = `rgba(255,255,255,0.95)`;
    for (const p of landmarks) {
      const x = p.x * w;
      const y = p.y * h;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // info badge
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(8, 8, 280, 64);
    ctx.fillStyle = "#fff";
    ctx.font = "14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(
      `Distance: ${(distance * 100).toFixed(0)}% far`,
      16,
      28
    );
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.fillText(
      `Closeness: ${(closeness * 100).toFixed(0)}% near`,
      16,
      48
    );
  };

  const runHandDetection = (video, now) => {
    const landmarker = handLandmarkerRef.current;
    if (!landmarker) return;

    if (now - lastHandDetectMsRef.current < HAND_DETECT_INTERVAL_MS) return;
    lastHandDetectMsRef.current = now;

    const result = landmarker.detectForVideo(video, now);
    lastHandResultRef.current = result;

    if (result?.landmarks?.length) {
      lastHandSeenMsRef.current = now;

      const landmarks = result.landmarks[0];
      let minX = 1,
        minY = 1,
        maxX = 0,
        maxY = 0;
      for (const p of landmarks) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      const area = (maxX - minX) * (maxY - minY);

      if (Number.isFinite(area) && area > 0) {
        minAreaRef.current = Math.min(minAreaRef.current, area);
        maxAreaRef.current = Math.max(maxAreaRef.current, area);
      }

      const minA = Number.isFinite(minAreaRef.current)
        ? Math.min(minAreaRef.current, DEFAULT_MIN_AREA)
        : DEFAULT_MIN_AREA;
      const maxA = Number.isFinite(maxAreaRef.current)
        ? Math.max(maxAreaRef.current, DEFAULT_MAX_AREA)
        : DEFAULT_MAX_AREA;

      const rawCloseness = clamp01((area - minA) / (maxA - minA + 1e-6));
      const closeness = clamp01(
        Math.pow(clamp01(rawCloseness * CLOSENESS_BOOST), CLOSENESS_GAMMA)
      );
      const distance = 1 - closeness;

      handMetricsRef.current = { closeness, distance };
      setHandInfo((prev) => ({
        ...prev,
        closeness,
        distance,
      }));

      const autoEnabled = autoResolutionEnabledRef.current;
      const emitFn = onAutoAsciiWidthRef.current;
      const range = autoAsciiWidthRangeRef.current;

      if (autoEnabled && typeof emitFn === "function") {
        const minAscii = range?.min ?? 10;
        const maxAscii = range?.max ?? 80;
        const target = Math.round(lerp(maxAscii, minAscii, closeness));

        const prevSmooth = smoothedAsciiWidthRef.current;
        const smooth =
          prevSmooth == null ? target : prevSmooth * 0.7 + target * 0.3;
        smoothedAsciiWidthRef.current = smooth;

        if (now - lastAutoEmitMsRef.current > 70) {
          const next = Math.round(smooth);
          if (lastAutoEmittedValueRef.current !== next) {
            lastAutoEmittedValueRef.current = next;
            emitFn(next);
          }
          lastAutoEmitMsRef.current = now;
        }
      }
    }
  };

  const asciiFrame = (now) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === 4) {
      // Always keep overlay responsive (it uses last-known landmarks).
      if (handLandmarkerRef.current) {
        runHandDetection(video, now);
        drawOverlay(now);
      }

      // Throttle ASCII conversion to avoid choppy UI.
      if (now - lastAsciiMsRef.current >= ASCII_INTERVAL_MS) {
        lastAsciiMsRef.current = now;

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
            <Box sx={{ position: "relative" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onPlay={startAscii}
                style={{ width: "100%", display: "block" }}
              />
              <canvas
                ref={overlayCanvasRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />
            </Box>
            {handError ? (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {handError}
              </Typography>
            ) : (
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.85 }}>
                Hand tracking:{" "}
                {handInfo.status === "ready"
                  ? handInfo.distance == null
                    ? "ready"
                    : `${(handInfo.distance * 100).toFixed(0)}% far`
                  : handInfo.status}
              </Typography>
            )}
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
