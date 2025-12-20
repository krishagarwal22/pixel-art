import Converter from "./components/Converter";
import ImageUploader from "./components/ImageUploader";
import { useState } from "react";

function App() {
  const [image, setImage] = useState(null);

  return (
    <div style={{ padding: "50px" }}>
      <ImageUploader onImageSelect={setImage} />
      <Converter selectedImage={image} />
    </div>
  );
}

export default App;
