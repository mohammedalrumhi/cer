import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Generate from './pages/Generate';
import Students from './pages/Students';
import TemplateNew from './pages/TemplateNew';
import TemplateEdit from './pages/TemplateEdit';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/students" element={<Students />} />
          <Route path="/templates/new" element={<TemplateNew />} />
          <Route path="/templates/:id/edit" element={<TemplateEdit />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
