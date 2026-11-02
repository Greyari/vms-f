import { lazy, Suspense, type ReactNode } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "./lib/queryClient"
import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { I18nProvider } from "./context/I18nContext"
import { ProtectedRoute } from "./components/ProtectedRoute"
import AppLayout from "./layouts/AppLayout"
import { permissionFor, type GuardedPath } from "./lib/routePermissions"

// Code-split per rute via React.lazy untuk optimasi dev server dan bundle size
const Login = lazy(() => import("./pages/Login"))
const CreateVisit = lazy(() => import("./pages/visits/CreateVisit"))
const VisitHistory = lazy(() => import("./pages/visits/VisitHistory"))
const VisitorReport = lazy(() => import("./pages/reports/VisitorReport"))
const VesselReport = lazy(() => import("./pages/reports/VesselReport"))
const CrewReport = lazy(() => import("./pages/reports/CrewReport"))
const PrintVisit = lazy(() => import("./pages/visits/PrintVisit"))
const Locations = lazy(() => import("./pages/master/Locations"))
const Staffs = lazy(() => import("./pages/master/Staffs"))
const Cards = lazy(() => import("./pages/master/Cards"))
const VehicleCards = lazy(() => import("./pages/master/VehicleCards"))
const Users = lazy(() => import("./pages/settings/Users"))
const Profile = lazy(() => import("./pages/settings/Profile"))
const ActivityLogs = lazy(() => import("./pages/settings/ActivityLogs"))
const Visitors = lazy(() => import("./pages/master/Visitors"))
const BlacklistedVisitors = lazy(() => import("./pages/master/BlacklistedVisitors"))
const VesselArrivals = lazy(() => import("./pages/vessels/VesselArrivals"))
const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"))
const Roles = lazy(() => import("./pages/settings/Roles"))
const AppOverview = lazy(() => import("./pages/settings/AppOverview"))
const NotFound = lazy(() => import("./pages/NotFound"))

function PageLoading() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center p-8">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
    </div>
  )
}

/**
 * A screen inside the sidebar layout, behind the permission ROUTE_PERMISSIONS gives it.
 * Returns a <Route> element (not a component) because <Routes> accepts only routes.
 */
function guarded(path: GuardedPath, element: ReactNode) {
  return (
    <Route
      key={path}
      element={<ProtectedRoute requiredPermission={permissionFor(path)} />}
    >
      <Route path={path.slice(1)} element={element} />
    </Route>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  <Route path="/login" element={<Login />} />

                  {/* Print page is separated from the sidebar layout */}
                  <Route
                    path="/visits/print"
                    element={
                      <ProtectedRoute
                        requiredPermission={permissionFor("/visits/print")}
                      />
                    }
                  >
                    <Route index element={<PrintVisit />} />
                  </Route>
                  <Route
                    path="/visits/:id/print"
                    element={
                      <ProtectedRoute
                        requiredPermission={permissionFor("/visits/:id/print")}
                      />
                    }
                  >
                    <Route index element={<PrintVisit />} />
                  </Route>

                  {/* Main Application Routes inside Sidebar Layout */}
                  <Route path="/" element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                      {/* Unguarded on purpose: refused users are sent here. */}
                      <Route index element={<Dashboard />} />

                      {guarded("/visits/history", <VisitHistory />)}
                      {guarded("/visits/create", <CreateVisit />)}
                      {/* Legacy routes redirected to unified Visit History page */}
                      <Route
                        path="visits/activate"
                        element={<Navigate to="/visits/history" replace />}
                      />
                      <Route
                        path="visits/reprint"
                        element={<Navigate to="/visits/history" replace />}
                      />
                      {guarded("/reports/visits", <VisitorReport />)}
                      {guarded("/reports/vessels", <VesselReport />)}
                      {guarded("/reports/crew", <CrewReport />)}
                      {/* Backwards compatibility alias */}
                      {guarded("/visits/report", <VisitorReport />)}
                      {guarded("/vessel-arrivals", <VesselArrivals />)}
                      {guarded("/master/visitors/blacklist", <BlacklistedVisitors />)}

                      {guarded("/master/locations", <Locations />)}
                      {guarded("/master/visitors", <Visitors />)}
                      {guarded("/master/staffs", <Staffs />)}
                      {guarded("/master/cards", <Cards />)}
                      {guarded("/master/vehicle-cards", <VehicleCards />)}

                      {guarded("/settings/users", <Users />)}
                      {guarded("/settings/logs", <ActivityLogs />)}
                      {guarded("/settings/profile", <Profile />)}
                      {guarded("/settings/roles", <Roles />)}
                      {guarded("/settings/overview", <AppOverview />)}

                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Route>
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
