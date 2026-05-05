import { Routes, Route } from "react-router-dom";
import LandingPage from "./LandingPage";
import DemoPage from "./demo/DemoPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo" element={<DemoPage />} />
    </Routes>
  );
}

export default App;
