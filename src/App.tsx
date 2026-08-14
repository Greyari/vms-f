import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import { ProtectedRoute } from "./components/ProtectedRoute"
import AppLayout from "./layouts/AppLayout"

import Login from "./pages/Login"
import CreateVisit from "./pages/visits/CreateVisit"
import ActiveVisits from "./pages/visits/ActiveVisits"
import Report from "./pages/visits/Report"
import PrintVisit from "./pages/visits/PrintVisit"
import Staffs from "./pages/master/Staffs"
import Cards from "./pages/master/Cards"
import VehicleCards from "./pages/master/VehicleCards"
import Users from "./pages/settings/Users"
import Profile from "./pages/settings/Profile"
import ActivityLogs from "./pages/settings/ActivityLogs"
import Visitors from "./pages/master/Visitors"
import BlacklistedVisitors from "./pages/master/BlacklistedVisitors"
import Dashboard from "./pages/dashboard/Dashboard"

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Print page is separated from the sidebar layout */}
          <Route path="/visits/print" element={<ProtectedRoute />}>
            <Route index element={<PrintVisit />} />
          </Route>

          {/* Main Application Routes inside Sidebar Layout */}
          <Route path="/" element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />

              <Route path="visits/activate" element={<ActiveVisits />} />
              <Route path="visits/create" element={<CreateVisit />} />
              <Route path="visits/report" element={<Report />} />
              <Route
                path="master/visitors/blacklist"
                element={<BlacklistedVisitors />}
              />

              <Route path="master/visitors" element={<Visitors />} />
              <Route path="master/staffs" element={<Staffs />} />
              <Route path="master/cards" element={<Cards />} />
              <Route path="master/vehicle-cards" element={<VehicleCards />} />

              <Route path="settings/users" element={<Users />} />
              <Route path="settings/logs" element={<ActivityLogs />} />
              <Route path="settings/profile" element={<Profile />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
