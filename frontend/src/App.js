import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import Aktualnosci from "@/pages/Aktualnosci";
import Liga from "@/pages/Liga";
import Turniej from "@/pages/Turniej";
import Admin from "@/pages/Admin";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Aktualnosci />} />
            <Route path="/liga" element={<Liga />} />
            <Route path="/turniej-amatorow" element={<Turniej />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </Layout>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
