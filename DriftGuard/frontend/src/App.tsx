import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline } from '@mui/material';

import Organizations from './components/Organizations';

// Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Environments from './components/Environments';
import Drifts from './components/Drifts';
import Recommendations from './components/Recommendations';
import PrivateRoute from './components/PrivateRoute';

// Placeholder component for settings (not implemented yet)
const Settings = () => <div>Settings page - Coming soon</div>;

function App() {
  return (
    <Router>
      <CssBaseline />
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes wrapped in Layout */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/organizations"
          element={
            <PrivateRoute>
              <Layout>
                <Organizations />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/environments"
          element={
            <PrivateRoute>
              <Layout>
                <Environments />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/drifts"
          element={
            <PrivateRoute>
              <Layout>
                <Drifts />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/recommendations"
          element={
            <PrivateRoute>
              <Layout>
                <Recommendations />
              </Layout>
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <Layout>
                <Settings />
              </Layout>
            </PrivateRoute>
          }
        />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
