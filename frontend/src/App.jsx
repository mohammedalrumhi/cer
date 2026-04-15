import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Students from './pages/Students';
import TemplateNew from './pages/TemplateNew';
import TemplateEdit from './pages/TemplateEdit';
import NotFound from './pages/NotFound';
import Login from './pages/Login';
import { isAuthenticated } from './api/client';
import './App.css';

function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function GuestRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={(
            <GuestRoute>
              <Login />
            </GuestRoute>
          )}
        />

        {/* Full-screen canvas editor — no layout wrapper */}
        <Route
          path="/templates/:id/edit"
          element={(
            <ProtectedRoute>
              <TemplateEdit />
            </ProtectedRoute>
          )}
        />

        {/* All other pages use the standard layout */}
        <Route
          path="*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/generate" element={<Generate />} />
                  <Route path="/students" element={<Students />} />
                  <Route path="/templates/new" element={<TemplateNew />} />
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
