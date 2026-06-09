import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { Layout } from "./components/Layout.js";
import { ChatPage } from "./routes/ChatPage.js";
import { MarketPage } from "./routes/MarketPage.js";
import { ResearchPage } from "./routes/ResearchPage.js";
import { PlannerPage } from "./routes/PlannerPage.js";
import { PortfolioPage } from "./routes/PortfolioPage.js";
import { JournalPage } from "./routes/JournalPage.js";
import { ReviewPage } from "./routes/ReviewPage.js";
import { PlaceholderPage } from "./routes/PlaceholderPage.js";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const routes = [
  createRoute({ getParentRoute: () => rootRoute, path: "/", component: ChatPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/market", component: MarketPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/research", component: ResearchPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/planner", component: PlannerPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/portfolio", component: PortfolioPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/journal", component: JournalPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/review", component: ReviewPage }),
  createRoute({ getParentRoute: () => rootRoute, path: "/evolution", component: () => <PlaceholderPage title="Evolution" /> }),
  createRoute({ getParentRoute: () => rootRoute, path: "/marketplace", component: () => <PlaceholderPage title="Marketplace" /> }),
];

export const router = createRouter({ routeTree: rootRoute.addChildren(routes) });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
