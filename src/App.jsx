import { Navigate, Route, Routes } from 'react-router-dom';
import { Landing } from './screens/Landing';
import { Project } from './screens/Project';

// The Brainwing mark lives inside each screen rather than here, so it can be tinted for
// the ground it sits on — ink on the paper index, bone over the photographs.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/:slug" element={<Project />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
