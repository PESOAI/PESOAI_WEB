import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  PieChart, 
} from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { name: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { name: 'User Management', path: '/admin/users', icon: <Users size={20} /> },
  ];

  const handleLogout = () => {
    if (window.confirm("Logout")) {
      navigate('/'); 
    }
  };

  
  const getHeaderTitle = () => {
    if (location.pathname === '/admin') return "Welcome Admin";
    if (location.pathname === '/admin/users') return "Account Monitoring";
    return "Admin Panel";
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* SIDEBAR */}
      <aside className="w-64 border-r border-slate-200 fixed h-full bg-white flex flex-col z-20">
        {/* LOGO SECTION */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-50">
          <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
            <PieChart className="text-white" size={24} />
          </div>
          <span className="font-bold text-xl text-slate-800 tracking-tight">PESO AI</span>
        </div>

        {/* NAVIGATION */}
        <nav className="p-4 flex-1 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                  isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* LOGOUT SECTION */}
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-all font-medium"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 ml-64">
        {/* TOP NAVBAR */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 px-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {getHeaderTitle()}
            </h2>
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-[0.2em] -mt-1">
              System Controller
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-800">Administrator</p>
              <p className="text-[10px] text-green-500 font-medium leading-none">Status: Online</p>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-md">
                AD
              </div>
              <span className="text-xs font-bold text-slate-700">Admin</span>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="p-8">
          <Outlet /> 
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;