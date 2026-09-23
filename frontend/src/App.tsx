import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { ToastProvider } from "./components/ui/Toast";
import { AppShell } from "./components/layout/AppShell";
import { LoginPage } from "./pages/LoginPage";
import { HomeLauncherPage } from "./pages/HomeLauncherPage";
import { CommandCenterPage } from "./pages/CommandCenterPage";
import { CrmLeadsPage } from "./pages/CrmLeadsPage";
import { LeadDetailPage } from "./pages/LeadDetailPage";
import { NewQuotationPage } from "./pages/NewQuotationPage";
import { QuotationDetailPage } from "./pages/QuotationDetailPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { InventoryPage } from "./pages/InventoryPage";
import { PurchasingPage } from "./pages/PurchasingPage";
import { PurchaseOrderDetailPage } from "./pages/PurchaseOrderDetailPage";
import { LogisticsPage } from "./pages/LogisticsPage";
import { DeliveryDetailPage } from "./pages/DeliveryDetailPage";
import { ComingSoonPage } from "./pages/ComingSoonPage";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                  <Route index element={<HomeLauncherPage />} />
                  <Route path="/command-center" element={<CommandCenterPage />} />

                  <Route path="/crm" element={<CrmLeadsPage />} />
                  <Route path="/crm/leads/:leadId" element={<LeadDetailPage />} />
                  <Route path="/crm/quotations/new" element={<NewQuotationPage />} />
                  <Route path="/crm/quotations/:quotationId" element={<QuotationDetailPage />} />

                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailPage />} />

                  <Route path="/inventory" element={<InventoryPage />} />

                  <Route path="/purchasing" element={<PurchasingPage />} />
                  <Route path="/purchasing/:purchaseOrderId" element={<PurchaseOrderDetailPage />} />

                  <Route path="/logistics" element={<LogisticsPage />} />
                  <Route path="/logistics/:deliveryId" element={<DeliveryDetailPage />} />

                  <Route path="/payments" element={<ComingSoonPage title="Payments" />} />
                  <Route path="/profitability" element={<ComingSoonPage title="Profitability" />} />
                  <Route path="/people-assets" element={<ComingSoonPage title="People & Assets" />} />
                  <Route path="/hr-incentives" element={<ComingSoonPage title="HR / Incentives" />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
