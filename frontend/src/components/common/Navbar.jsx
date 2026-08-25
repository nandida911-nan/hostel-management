import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, DEMO_ACCOUNTS } from '../../context/AuthContext';
import { 
  Building2, 
  LogOut, 
  User, 
  ShieldCheck, 
  GraduationCap, 
  Shield, 
  ChevronDown,
  Sparkles
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, quickDemoLogin } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleSwitchRole = async (role) => {
    setDropdownOpen(false);
    await quickDemoLogin(role);
    if (role === 'student') navigate('/student');
    else if (role === 'warden') navigate('/warden');
    else if (role === 'guard') navigate('/security');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'student':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <GraduationCap className="w-3.5 h-3.5" /> Student Portal
          </span>
        );
      case 'warden':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Warden Admin
          </span>
        );
      case 'guard':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Shield className="w-3.5 h-3.5" /> Gate Security
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-slate-900 via-indigo-950 to-indigo-800 bg-clip-text text-transparent">
                Hostel<span className="text-indigo-600">Ease</span>
              </span>
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Campus Hostel Management System</p>
            </div>
          </div>

          {/* User info & Demo Quick Switcher */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2">
                {getRoleBadge(user.role)}
              </div>

              {/* Guide Demo Switcher */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition border border-indigo-200"
                  title="Switch roles instantly for college presentation / guide demo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden sm:inline">Switch Demo Role</span>
                  <ChevronDown className="w-3 h-3 text-indigo-500" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Switch Role for Guide Demo
                    </div>
                    <button
                      onClick={() => handleSwitchRole('student')}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${user.role === 'student' ? 'text-blue-700 font-semibold bg-blue-50/50' : 'text-slate-700'}`}
                    >
                      <GraduationCap className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Student View</div>
                        <div className="text-[10px] text-slate-400">Nandida K (22CS101)</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSwitchRole('warden')}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${user.role === 'warden' ? 'text-purple-700 font-semibold bg-purple-50/50' : 'text-slate-700'}`}
                    >
                      <ShieldCheck className="w-4 h-4 text-purple-600" />
                      <div>
                        <div className="font-medium">Warden Admin View</div>
                        <div className="text-[10px] text-slate-400">Dr. S. Ramanujan</div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleSwitchRole('guard')}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 ${user.role === 'guard' ? 'text-emerald-700 font-semibold bg-emerald-50/50' : 'text-slate-700'}`}
                    >
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="font-medium">Gate Security View</div>
                        <div className="text-[10px] text-slate-400">Officer Rajesh Kumar</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* User Avatar & Name */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[130px]">{user.name}</div>
                  <div className="text-[10px] text-slate-500">{user.email}</div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}