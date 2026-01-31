import { Outlet } from 'react-router-dom';
import { Header } from './Header';

export function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-dark-950">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-dark-800 py-4 text-center text-dark-500 text-sm">
        OG Predict - Powered by 0G Network
      </footer>
    </div>
  );
}
