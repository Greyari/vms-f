import type { ReactNode } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { I18nProvider } from "./context/I18nContext"
import { ProtectedRoute } from "./components/ProtectedRoute"
import AppLayout from "./layouts/AppLayout"
import { permissionFor, type GuardedPath } from "./lib/routePermissions"

import Login from "./pages/Login"
import CreateVisit from "./pages/visits/CreateVisit"
import ActiveVisits from "./pages/visits/ActiveVisits"
import VisitorReport from "./pages/reports/VisitorReport"
import VesselReport from "./pages/reports/VesselReport"
import PrintVisit from "./pages/visits/PrintVisit"
import Reprint from "./pages/visits/Reprint"
import Locations from "./pages/master/Locations"
import Staffs from "./pages/master/Staffs"
import Cards from "./pages/master/Cards"
import VehicleCards from "./pages/master/VehicleCards"
import Users from "./pages/settings/Users"
import Profile from "./pages/settings/Profile"
import ActivityLogs from "./pages/settings/ActivityLogs"
import Visitors from "./pages/master/Visitors"
import BlacklistedVisitors from "./pages/master/BlacklistedVisitors"
import VesselArrivals from "./pages/vessels/VesselArrivals"
import Dashboard from "./pages/dashboard/Dashboard"
import Roles from "./pages/settings/Roles"
import NotFound from "./pages/NotFound"

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
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <Router>
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

              {guarded("/visits/activate", <ActiveVisits />)}
              {guarded("/visits/create", <CreateVisit />)}
              {guarded("/visits/reprint", <Reprint />)}
              {guarded("/reports/visits", <VisitorReport />)}
              {guarded("/reports/vessels", <VesselReport />)}
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

              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
    </I18nProvider>
    </ThemeProvider>
  )
}

export default App
