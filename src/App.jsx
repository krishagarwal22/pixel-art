import AugmentedFeed from "./components/AugmentedFeed";
import { useState } from "react";
import Slider from "@mui/material/Slider";

function App() {
  /* resolution in terms of tens of characters per line */
  const [asciiWidth, setAsciiWidth] = useState(50);
  /* characters used in ascii conversion, from darkest to lightest */
  const [chars, setChars] = useState(" .:-=+*#%@");

  const updateWidth = (event, value) => {
    setAsciiWidth(value);
  };

  return (
    <div style={{ padding: "50px" }}>
      <Slider value={asciiWidth} onChange={updateWidth} />
      <AugmentedFeed width={6 * asciiWidth + 25} chars={chars} />
    </div>
  );
}

export default App;
