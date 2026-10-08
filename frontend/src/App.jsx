import React, { useState } from 'react';
import Navbar from './components/common/Navbar';
import ReportForm from './components/citizen/ReportForm';
import AdminDashboard from './components/camp_admin/AdminDashboard';
import PublicMap from './components/public_map/PublicMap';
import GovtPortal from './components/govt_portal/GovtPortal';

function App() {
  const [activeTab, setActiveTab] = useState('citizen');

  return (
    <div className="min-h-screen flex flex-col h-screen overflow-hidden bg-slate-50 text-slate-900">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-6 overflow-y-auto bg-slate-50">
        {activeTab === 'citizen' && <ReportForm />}
        {activeTab === 'public_map' && <PublicMap />}
        {activeTab === 'camp_admin' && <AdminDashboard />}
        {activeTab === 'govt_admin' && <GovtPortal />}
      </main>
    </div>
  );
}

export default App;