import React from "react";
import WatchStore from "./components/Pages/WatchStore";
import ProductDetail from "./components/Pages/ProductDetail";
import VirtualWear from "./components/Pages/VirtualWear";
import VirtualResult from "./components/Pages/VirtualResult";
import { BrowserRouter, Routes, Route } from "react-router-dom";


function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WatchStore />} />
          <Route path="/watch-store" element={<WatchStore />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/virtual-wear" element={<VirtualWear />} />
          <Route path="/virtual-result" element={<VirtualResult />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
