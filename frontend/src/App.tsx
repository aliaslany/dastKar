import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Product from "./pages/Product";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Orders from "./pages/Orders";
import PaymentCallback from "./pages/PaymentCallback";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import DashboardHome from "./pages/dashboard/DashboardHome";
import Listings from "./pages/dashboard/Listings";
import NewListing from "./pages/dashboard/NewListing";
import ShopOrders from "./pages/dashboard/ShopOrders";
import ShopSettings from "./pages/dashboard/ShopSettings";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Search />} />
          <Route path="/product/:id" element={<Product />} />
          <Route path="/shop/:slug" element={<Shop />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout/:shopId" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/orders/verify" element={<PaymentCallback />} />

          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="listings" element={<Listings />} />
            <Route path="listings/new" element={<NewListing />} />
            <Route path="orders" element={<ShopOrders />} />
            <Route path="settings" element={<ShopSettings />} />
          </Route>
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
