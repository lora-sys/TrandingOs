import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout";
import ChatPage from "./pages/ChatPage";
import { DashboardPage } from "./pages/DashboardPage";
import { MarketPage } from "./pages/MarketPage";
import { PortfolioPage } from "./pages/PortfolioPage";
import { MemoryPage } from "./pages/MemoryPage";
import { TimelinePage } from "./pages/TimelinePage";

/* ── Root route (layout) ── */
const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

/* ── Page routes ── */
const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ChatPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/market",
  component: MarketPage,
});

const portfolioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/portfolio",
  component: PortfolioPage,
});

const memoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/memory",
  component: MemoryPage,
});

const timelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/timeline",
  component: TimelinePage,
});

/* ── Router tree ── */
const routeTree = rootRoute.addChildren([
  chatRoute,
  dashboardRoute,
  marketRoute,
  portfolioRoute,
  memoryRoute,
  timelineRoute,
]);

export const router = createRouter({ routeTree });

/* Type-safe router declaration */
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
