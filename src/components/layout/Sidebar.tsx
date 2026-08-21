import React from 'react';
import { BrandKit } from '../../types/brandKit';
import { 
  LayoutDashboard, 
  FolderKanban, 
  Palette, 
  Search, 
  Settings
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  brandKit: BrandKit;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  brandKit,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'campaigns', label: 'Campaign Library', icon: FolderKanban },
    { id: 'brand', label: 'Brand Kit', icon: Palette },
    { id: 'leads', label: 'Lead Finder', icon: Search },
    { id: 'settings', label: 'Provider Settings', icon: Settings },
  ];

  return (
    <aside className="w-16 md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between border-r border-slate-800 shrink-0 h-screen sticky top-0">
      {/* Top Brand / Logo */}
      <div>
        <div className="p-3 md:p-6 border-b border-slate-800 flex items-center justify-center md:justify-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black text-sm shadow-md">
            Z
          </div>
          <div className="hidden md:block min-w-0 flex-1">
            <h1 className="text-xs font-bold text-white uppercase tracking-wider font-mono truncate">
              Zaw Studio
            </h1>
            <p className="text-[10px] text-slate-400 font-mono truncate">
              Real Estate Automation
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 md:p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                title={item.label}
                className={`w-full flex items-center justify-center md:justify-start gap-3 px-2 md:px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Active Brand Context Footer */}
      <div className="hidden md:block p-4 m-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono uppercase text-slate-400">Active Brand</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
        <div className="text-xs font-bold text-white truncate">{brandKit.companyName}</div>
        <div className="text-[10px] text-slate-400 font-mono truncate">{brandKit.website}</div>
      </div>
    </aside>
  );
};
