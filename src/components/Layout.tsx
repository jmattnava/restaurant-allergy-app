import { ReactNode, useState } from 'react';
import { LucideIcon, Menu, X } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  section: 'primary' | 'manage' | 'tools';
}

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  navItems: NavItem[];
  onNavigate: (page: string) => void;
}

export default function Layout({ children, currentPage, navItems, onNavigate }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const primaryItems = navItems.filter(item => item.section === 'primary');
  const manageItems = navItems.filter(item => item.section === 'manage');
  const toolsItems = navItems.filter(item => item.section === 'tools');

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-900 text-white p-2 rounded-lg shadow-lg print:hidden"
        aria-label="Toggle menu"
      >
        {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden print:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-slate-900 text-white flex flex-col border-r border-slate-800
        transform transition-transform duration-200 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        print:hidden
      `}>
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold tracking-tight">AllergyCheck</h1>
          <p className="text-xs text-slate-400 mt-1">Restaurant Safety Tool</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 mb-3">
              Decision & Menu
            </h2>
            <ul className="space-y-2">
              {primaryItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 mb-3">
              Management
            </h2>
            <ul className="space-y-2">
              {manageItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-4 mb-3">
              Tools
            </h2>
            <ul className="space-y-2">
              {toolsItems.map(item => (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <p>v1.0.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 pt-16 lg:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
