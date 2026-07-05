import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const Layout = ({ children }) => (
  <div className="App flex flex-col min-h-screen bg-white">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);
