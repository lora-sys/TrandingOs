import { lazy, Suspense, type ComponentType } from "react";
import { createRootRoute, createRoute, createRouter, Outlet } from "@tanstack/react-router";
import { AppLayout } from "./components/AppLayout";

/* ── Lazy-loaded pages (code-split) ── */
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))) as ComponentType<{}>;
const MarketPage = lazy(() => import("./pages/MarketPage").then((m) => ({ default: m.MarketPage }))) as ComponentType<{}>;
const TimelinePage = lazy(() => import("./pages/TimelinePage").then((m) => ({ default: m.TimelinePage }))) as ComponentType<{}>;
const WorkspacePage = lazy(() => import("./pages/WorkspacePage").then((m) => ({ default: m.WorkspacePage }))) as ComponentType<{}>;
const JournalPage = lazy(() => import("./pages/JournalPage").then((m) => ({ default: m.JournalPage }))) as ComponentType<{}>;
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))) as ComponentType<{}>;
const EvolutionPage = lazy(() => import("./pages/EvolutionPage").then((m) => ({ default: m.EvolutionPage }))) as ComponentType<{}>;
const MemoryPage = lazy(() => import("./pages/MemoryPage").then((m) => ({ default: m.MemoryPage }))) as ComponentType<{}>;

/** Shared Suspense fallback for lazy routes */
function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="size-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

/** Wrap a lazy component with Suspense + fallback */
function withSuspense<P extends object>(Component: React.ComponentType<P>): React.FC<P> {
  const Wrapped = (props: P) => (
    <Suspense fallback={<PageFallback />}>
      <Component {...props} />
    </Suspense>
  );
  Wrapped.displayName = Component.displayName || "WithSuspense";
  return Wrapped;
}

/* ── Root route (layout) ── */
const rootRoute = createRootRoute({
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

/* ── Page routes (lazy-loaded via code-split) ── */
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: withSuspense(DashboardPage),
});

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/markets",
  component: withSuspense(MarketPage),
});

const workspaceRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspace",
  component: withSuspense(WorkspacePage),
});

const workspaceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/workspace/$workspaceId",
  component: withSuspense(WorkspacePage),
});

const journalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/journal",
  component: withSuspense(JournalPage),
});

const timelineRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/timeline",
  component: withSuspense(TimelinePage),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: withSuspense(SettingsPage),
});

const memoryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/memory",
  component: withSuspense(MemoryPage),
});

const evolutionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/evolution",
  component: withSuspense(EvolutionPage),
});

/* ── Router tree ── */
const routeTree = rootRoute.addChildren([
  dashboardRoute,
  marketRoute,
  workspaceRoute,
  workspaceDetailRoute,
  journalRoute,
  timelineRoute,
  settingsRoute,
  memoryRoute,
  evolutionRoute,
]);

export const router = createRouter({ routeTree });

/* Type-safe router declaration */
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
