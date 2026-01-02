import AugmentedFeed from "./components/AugmentedFeed";
import { useState } from "react";
import { Typography, Slider } from "@mui/material";

function App() {
  /* resolution in terms of tens of characters per line */
  const [asciiWidth, setAsciiWidth] = useState(35);
  /* characters used in ascii conversion, from darkest to lightest */
  const [chars, setChars] = useState(" .:-=+*#%@");

  const updateWidth = (event, value) => {
    setAsciiWidth(value);
  };

  return (
    <div style={{ padding: "50px" }}>
      <Typography variant="h5" align="center" gutterBottom>
        Adjust Resolution
      </Typography>
      <Slider value={asciiWidth} onChange={updateWidth} />
      <AugmentedFeed width={4 * asciiWidth + 25} chars={chars} />
    </div>
  );
}

export default App;
