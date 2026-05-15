import './App.css';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./components/Home/Home";
import Login from "./components/Login/Login";
import Register from "./components/Register/Register";
import ForgotPassword from "./components/Login/ForgotPassword";
import ResetPassword from "./components/Login/ResetPassword";

import DashboardOverview from "./components/admin/DashboardOverview";
import Adminlayout from './components/admin/Adminlayout';
import CitizenManagement from "./components/admin/CitizenManagement";
import EmployeeManagement from "./components/admin/EmployeeManagement";
import CategoryManagement from "./components/admin/CategoryManagement";
import DepartmentManagement from "./components/admin/DepartmentManagement";
import AdminSettings from "./components/admin/AdminSettings";
import AdminProfile from "./components/admin/AdminProfile";
import AdminAnalytics from "./components/admin/AdminAnalytics";
import AdminMap from "./components/admin/AdminMap";
import AdminComplaints from "./components/admin/AdminComplaints";
import AdminComplaintDetail from "./components/admin/AdminComplaintDetail";
import CitizenDashboard from "./components/citizen/CitizenDashboard";
import CitizenLayout from "./components/citizen/CitizenLayout";
import MyComplaints from "./components/citizen/MyComplaints";
import CitizenProfile from "./components/citizen/CitizenProfile";
import CitizenComplaintMap from "./components/citizen/CitizenComplaintMap";
import CitizenComplaintDetail from "./components/citizen/CitizenComplaintDetail";
import FieldworkerLayout from "./components/fieldworker/FieldworkerLayout";
import FieldWorkerOverview from "./components/fieldworker/FieldWorkerOverview";
import MyTasks from "./components/fieldworker/MyTasks";
import TaskHistory from "./components/fieldworker/TaskHistory";
import TaskAction from "./components/fieldworker/TaskAction";
import WorkSummary from "./components/fieldworker/WorkSummary";
import FieldworkerProfile from "./components/fieldworker/FieldworkerProfile";
import FieldworkerComplaintDetail from "./components/fieldworker/FieldworkerComplaintDetail";
import OfficerOverview from "./components/officer/OfficerOverview";
import OfficerLayout from "./components/officer/officerLayout";
import OfficerProfile from "./components/officer/OfficerProfile";
import OfficerComplaint from './components/officer/OfficerComplaint';
import OfficerComplaintDetail from './components/officer/OfficerComplaintDetail';
import MyTeam from './components/officer/MyTeam';
import OfficerAnalytics from './components/officer/OfficerAnalytics';
import OfficerReports from './components/officer/OfficerReports';
import OfficerActivity from './components/officer/OfficerActivity';
import ProtectedRoute from './components/common/ProtectedRoute';
import Unauthorized from './components/common/Unauthorized';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <div className="App">
      {/* 
        ========================================================
        VIVA EXPLANATION: Global ToastContainer Setup
        ========================================================
        - Purpose: Replaces synchronous, blocking alert() calls.
        - UX Benefit: Modern, non-blocking feedback that auto-closes, 
          preventing the UI from freezing and requiring user dismissal.
        - Config: Top-right position, 3s auto-close, colored theme 
          for clear visual cues (green=success, red=error).
      */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Wrap Admin Routes with ProtectedRoute - only 'admin' role allowed */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<Adminlayout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="citizens" element={<CitizenManagement />} />
              <Route path="employees" element={<EmployeeManagement />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="departments" element={<DepartmentManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="map" element={<AdminMap />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="complaint/:id" element={<AdminComplaintDetail />} />
              <Route path="profile" element={<AdminProfile />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Route>

          {/* Wrap Citizen Routes with ProtectedRoute - only 'citizen' role allowed */}
          <Route element={<ProtectedRoute allowedRoles={['citizen']} />}>
            <Route path="/citizen" element={<CitizenLayout />}>
              <Route index element={<CitizenDashboard />} />
              <Route path="history" element={<MyComplaints />} />
              <Route path="profile" element={<CitizenProfile />} />
              <Route path="map" element={<CitizenComplaintMap />} />
              <Route path="complaint/:id" element={<CitizenComplaintDetail />} />
            </Route>
          </Route>


          {/* Wrap Fieldworker Routes with ProtectedRoute - only 'field' role allowed */}
          <Route element={<ProtectedRoute allowedRoles={['field']} />}>
            <Route path="/fieldworker" element={<FieldworkerLayout />}>
              <Route index element={<FieldWorkerOverview />} />
              <Route path="profile" element={<FieldworkerProfile />} />
              <Route path="tasks" element={<MyTasks />} />
              <Route path="history" element={<TaskHistory />} />
              <Route path="summary" element={<WorkSummary />} />
              <Route path="task/:id" element={<TaskAction />} />
              <Route path="complaint/:id" element={<FieldworkerComplaintDetail />} />
            </Route>
          </Route>

          {/* Wrap Officer Routes with ProtectedRoute - only 'officer' role allowed */}
          <Route element={<ProtectedRoute allowedRoles={['officer']} />}>
            <Route path="/officer" element={<OfficerLayout />}>
              <Route index element={<OfficerOverview />} />
              <Route path="profile" element={<OfficerProfile />} />
              <Route path="complaints" element={<OfficerComplaint />} />
              <Route path="complaints/:status" element={<OfficerComplaint />} />
              <Route path="complaint/:id" element={<OfficerComplaintDetail />} />
              <Route path="team" element={<MyTeam />} />
              <Route path="analytics" element={<OfficerAnalytics />} />
              <Route path="reports" element={<OfficerReports />} />
              <Route path="activity" element={<OfficerActivity />} />
            </Route>
          </Route>

        </Routes>
      </Router>
    </div>
  );
}

export default App;

