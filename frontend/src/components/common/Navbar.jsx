import React from 'react';
import { Activity, User } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'citizen', label: 'Citizen Report' },
     { id: 'public_map', label: 'Public Map' },
    { id: 'camp_admin', label: 'Camp Admin' },
    { id: 'govt_admin', label: 'Govt Portal' }
  ];

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-600">
          <Activity size={18} className="absolute z-10" />
          <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20"></div>
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900">Aidera</h1>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider -mt-1">AI Logistics Engine</p>
        </div>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-white text-sky-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <select className="text-xs border border-slate-200 bg-slate-50 text-slate-600 rounded px-2 py-1 outline-none">
          <option>Demo Presets</option>
          <option>1. Winter Need</option>
          <option>2. Medical Outbreak</option>
        </select>
        <button className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-200">
          <User size={16} />
        </button>
      </div>
    </nav>
  );
}