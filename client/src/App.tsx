import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Home, Users, IndianRupee, Settings, Building, Shield, FileText, AlertCircle, CreditCard, Moon, Sun, LogOut, BarChart3 } from 'lucide-react';
import './index.css';
import { OrganizationSetup } from './pages/OrganizationSetup';
import { StudentsList } from './pages/StudentsList';
import { OnboardStudent } from './pages/OnboardStudent';
import { FeeCollection } from './pages/FeeCollection';
import { Dashboard } from './pages/Dashboard';
import { TransactionsList } from './pages/TransactionsList';
import { DefaultersList } from './pages/DefaultersList';
import { StudentProfile } from './pages/StudentProfile';
import Expenses from './pages/Expenses';
import SettingsPage from './pages/Settings';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './pages/Login';
import Reports from './pages/Reports';

import { useTheme } from './contexts/ThemeContext';
import { Button } from './components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full"
    >
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

function Sidebar({ userRole }: { userRole: 'admin' | 'manager' | 'accountant' }) {
  const location = useLocation();
  
  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => {
    const isActive = location.pathname === to;
    return (
      <Link to={to} className="outline-none">
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
          isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
        }`}>
          <Icon size={20} />
          {label}
        </div>
      </Link>
    );
  };

  return (
    <aside className="print:hidden w-72 h-full bg-card border-r border-border p-6 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-sm z-10 relative">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-xl font-bold text-primary mb-8">
          <span>Gurukul Finance</span>
        </div>
        
        <nav className="flex flex-col gap-2">
          {userRole !== 'accountant' && <NavItem to="/" icon={Home} label="Dashboard" />}
          <NavItem to="/students" icon={Users} label="Students" />
          <NavItem to="/fees" icon={IndianRupee} label="Fee Collection" />
          <NavItem to="/transactions" icon={FileText} label="Transactions" />
          {userRole !== 'accountant' && <NavItem to="/defaulters" icon={AlertCircle} label="Defaulters" />}
          <NavItem to="/expenses" icon={CreditCard} label="Expenses" />
          {userRole !== 'accountant' && <NavItem to="/reports" icon={BarChart3} label="Reports" />}
          {(userRole === 'admin' || userRole === 'manager') && (
            <>
              <NavItem to="/organization" icon={Building} label="Organization" />
              <NavItem to="/settings" icon={Settings} label="Settings" />
            </>
          )}
        </nav>
      </div>

      <div className="p-4 bg-muted/50 rounded-lg border border-border text-sm mt-auto">
        <div className="flex items-center gap-2 mb-2 font-semibold">
          <Shield size={16} className="text-primary" />
          Current Role
        </div>
        <div className="flex justify-between items-center capitalize text-muted-foreground">
          <span>{userRole}</span>
        </div>
      </div>
    </aside>
  );
}

function AuthenticatedApp() {
  const { session, role, loading, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading...</div>;
  }

  if (!session) {
    return <Login />;
  }

  const activeRole = (role || 'accountant') as 'admin' | 'manager' | 'accountant';
  const isManagement = activeRole === 'admin' || activeRole === 'manager';

  return (
    <div className="flex h-screen print:h-auto overflow-hidden print:overflow-visible bg-background text-foreground">
      <Sidebar userRole={activeRole} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full print:h-auto overflow-hidden print:overflow-visible relative">
        <header className="print:hidden flex justify-end items-center px-8 py-4 border-b border-border bg-card/50 backdrop-blur-md z-10 gap-4">
          <ThemeToggle />
          <Button variant="outline" onClick={signOut} className="gap-2">
            <LogOut size={16} />
            Sign Out
          </Button>
        </header>
        
        <div className="flex-1 overflow-y-auto print:overflow-visible p-8 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full print:h-auto"
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={activeRole === 'accountant' ? <Navigate to="/students" replace /> : <Dashboard />} />
                
                <Route path="/students" element={<StudentsList />} />
                <Route path="/students/onboard" element={<OnboardStudent />} />
                <Route path="/students/:id" element={<StudentProfile />} />
                
                <Route path="/fees" element={<FeeCollection />} />
                <Route path="/transactions" element={<TransactionsList />} />
                <Route path="/defaulters" element={activeRole === 'accountant' ? <Navigate to="/students" replace /> : <DefaultersList />} />
                <Route path="/expenses" element={<Expenses userRole={activeRole} />} />
                <Route path="/reports" element={activeRole === 'accountant' ? <Navigate to="/students" replace /> : <Reports />} />
                
                {/* Protected Management Routes */}
                <Route 
                  path="/organization" 
                  element={isManagement ? <OrganizationSetup userRole={activeRole as 'manager' | 'accountant'} /> : <Navigate to="/" replace />} 
                />
                <Route 
                  path="/settings" 
                  element={isManagement ? <SettingsPage /> : <Navigate to="/" replace />} 
                />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
