import AugmentedFeed from "./components/AugmentedFeed";
import { useState } from "react";
import {
  Box,
  FormControlLabel,
  Slider,
  Switch,
  Typography,
} from "@mui/material";

function App() {
  /* resolution in terms of tens of characters per line */
  const [asciiWidth, setAsciiWidth] = useState(35);
  /* characters used in ascii conversion, from darkest to lightest */
  const [chars] = useState(" .:-=+*#%@");
  const [autoResolution, setAutoResolution] = useState(false);

  const MIN_ASCII_WIDTH = 10;
  const MAX_ASCII_WIDTH = 80;
  const AUTO_MAX_ASCII_WIDTH = 55;

  const updateWidth = (event, value) => {
    setAsciiWidth(value);
  };

  return (
    <div style={{ padding: "50px" }}>
      <Box sx={{ maxWidth: 900, mx: "auto" }}>
        <Typography variant="h5" align="center" gutterBottom>
          Resolution
        </Typography>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoResolution}
                onChange={(e) => setAutoResolution(e.target.checked)}
              />
            }
            label="Auto (hand distance)"
          />
        </Box>

        <Typography align="center" sx={{ mb: 1 }}>
          {autoResolution ? "Auto" : "Manual"}: {asciiWidth} columns
        </Typography>

        <Slider
          value={asciiWidth}
          onChange={updateWidth}
          min={MIN_ASCII_WIDTH}
          max={MAX_ASCII_WIDTH}
          step={1}
          valueLabelDisplay="auto"
          disabled={autoResolution}
        />

        <AugmentedFeed
          width={4 * asciiWidth + 25}
          chars={chars}
          autoResolutionEnabled={autoResolution}
          onAutoAsciiWidth={(next) => setAsciiWidth(next)}
          autoAsciiWidthRange={{
            min: MIN_ASCII_WIDTH,
            max: AUTO_MAX_ASCII_WIDTH,
          }}
        />
      </Box>
    </div>
  );
}

export default App;
