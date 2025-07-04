import React, { lazy, Suspense } from "react";
import Regist from "./auth/Regist";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProductDetail from "./components/Pages/ProductDetail";
import VirtualWear from "./components/Pages/VirtualWear";
import VirtualResult from "./components/Pages/VirtualResult";
import Login from "./components/Pages/Login";
import Cart from "./components/Pages/Cart";
import Wishlist from "./components/Pages/Wishlist"; 
import NotFound from "./components/Pages/NotFound";

const WatchStore = lazy(() => import("./components/Pages/WatchStore"));

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Suspense fallback={<div className="animate-spin flex justify-center items-center h-screen">페이지 불러오는중...</div>}><WatchStore /></Suspense>} />
          <Route path="/watch-store" element={<WatchStore />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/virtual-wear" element={<VirtualWear />} />
          <Route path="/virtual-result" element={<VirtualResult />} />
          <Route path="/login" element={<Login />} /> 
          <Route path="/regist" element={<Regist />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
