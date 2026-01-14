import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { Navigation } from "./components/Navigation";
import { Dashboard } from "./pages/Dashboard";
import { CustomersOverview } from "./pages/CustomersOverview";
import { LeadsPage } from "./pages/LeadsPage";
import { InboxPage } from "./pages/InboxPage";
import { CustomerDetail } from "./pages/CustomerDetail";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <BrowserRouter>
        <div className="flex flex-col min-h-screen">
          <Navigation />
          <main className="flex-1 container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<CustomersOverview />} />
              <Route path="/customers/:customerId" element={<CustomerDetail />} />
              <Route path="/leads" element={<LeadsPage />} />
              <Route path="/inbox" element={<InboxPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
      <Toaster />
    </div>
  );
}

export default App;