import AugmentedFeed from "./components/AugmentedFeed";
import { useState } from "react";
import Slider from "@mui/material/Slider";

function App() {
  const [asciiWidth, setAsciiWidth] = useState(50);
  const [chars, setChars] = useState("@%#*+=-:. ");

  const updateWidth = (event, value) => {
    setAsciiWidth(value);
  };

  return (
    <div style={{ padding: "50px" }}>
      {/* <Box sx={{ width: "200" }}> */}
      <Slider value={asciiWidth} onChange={updateWidth} />
      {/* </Box> */}
      <AugmentedFeed width={10 * asciiWidth} chars={chars} />
    </div>
  );
}

export default App;
