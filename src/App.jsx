import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './screens/Landing';
import { Project } from './screens/Project';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/:slug" element={<Project />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
