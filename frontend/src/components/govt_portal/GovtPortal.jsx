import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, ShieldCheck, Activity, RefreshCw, Send, Sparkles, X, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function GovtPortal() {
  // Global Tab Authentication State
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [reports, setReports] = useState([]);
  const [camps, setCamps] = useState([]);
  const [aiBriefing, setAiBriefing] = useState({
    priority_level: 'STABLE',
    headline: 'Analyzing live state telemetry...',
    summary: 'Evaluating cross-camp emergency patterns...'
  });
  const [loading, setLoading] = useState(true);
  const [summarizing, setSummarizing] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginPassword === 'demo123') {
      setIsAuthorized(true);
    } else {
      setLoginError('Invalid State Authority Password');
    }
  };

  const fetchGovtData = async () => {
    setLoading(true);
    try {
      const { data: campsData } = await supabase.from('camps').select('*');
      setCamps(campsData || []);

      const { data, error } = await supabase
        .from('resident_reports')
        .select('*')
        .eq('review_status', 'ESCALATED_GOVT')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
      
      fetchAiSummary();
    } catch (err) {
      console.error("Error fetching govt portal data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiSummary = async () => {
    setSummarizing(true);
    try {
      const res = await fetch('http://localhost:8000/api/govt/ai-summary', { method: 'POST' });
      const data = await res.json();
      if (data.headline) {
        setAiBriefing(data);
      }
    } catch (err) {
      console.error("AI summary error:", err);
      setAiBriefing({
        priority_level: 'STABLE',
        headline: 'AI situational briefing currently unavailable.',
        summary: 'Unable to connect to telemetry analysis engine.'
      });
    } finally {
      setSummarizing(false);
    }
  };

  // Only fetch data if authorized
  useEffect(() => {
    if (!isAuthorized) return;

    fetchGovtData();

    const subscription = supabase
      .channel('public:govt_escalations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resident_reports' }, () => {
        fetchGovtData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [isAuthorized]);

  const updateClusterGovtStatus = async (reportIds, newGovtStatus) => {
    try {
      const updatePayload = { 
        govt_status: newGovtStatus,
        ...(newGovtStatus === 'RESOLVED_GOVT' ? { review_status: 'FULFILLED' } : {})
      };

      for (const id of reportIds) {
        const { error } = await supabase
          .from('resident_reports')
          .update(updatePayload)
          .eq('id', id);

        if (error) throw error;
      }

      setReports(prev => prev.map(rep => reportIds.includes(rep.id) ? { ...rep, ...updatePayload } : rep));
    } catch (err) {
      console.error("Error updating state status:", err);
      alert("Failed to update status. Please try again.");
    }
  };

  // Render Login Screen if not authorized
  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 bg-sky-100 text-sky-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">State Authority Access</h2>
        <p className="text-sm text-slate-500 mb-6">Enter the government nodal officer password to view live telemetry and manage escalated work orders.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="password" 
              placeholder="Enter Password (demo123)"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-center font-mono"
              autoFocus
            />
          </div>
          {loginError && <p className="text-red-500 text-xs font-bold">{loginError}</p>}
          <button 
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  const campMap = {};
  camps.forEach(c => {
    campMap[c.id] = c.name;
  });

  // AI CLUSTERING: Group escalated items by camp + category
  const clusteredMap = {};
  reports.forEach(report => {
    const campName = campMap[report.camp_id] || 'Relief Camp';
    const key = `${report.camp_id}_${report.category}`;
    if (!clusteredMap[key]) {
      clusteredMap[key] = {
        key,
        camp_name: campName,
        category: report.category,
        total_quantity: 0,
        reports_count: 0,
        latest_status: report.govt_status || 'LOOKING_INTO_IT',
        all_ids: []
      };
    }
    clusteredMap[key].total_quantity += (report.quantity || 1);
    clusteredMap[key].reports_count += 1;
    clusteredMap[key].all_ids.push(report.id);
  });

  const clusteredWorkOrders = Object.values(clusteredMap);

  // Live Metrics
  const totalClusters = clusteredWorkOrders.length;
  const inProgressCount = clusteredWorkOrders.filter(w => w.latest_status !== 'RESOLVED_GOVT').length;
  const resolvedCount = clusteredWorkOrders.filter(w => w.latest_status === 'RESOLVED_GOVT').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Government State Portal</h2>
          <p className="text-sm text-slate-500">AI-clustered cross-camp work orders, situational briefs, and state coordination.</p>
        </div>
        <button 
          onClick={fetchGovtData}
          className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Sync State Feed
        </button>
      </div>

      {/* AI Dynamic Priority Intelligence Banner */}
      <div className={`border rounded-xl p-5 flex items-start gap-4 shadow-sm transition-colors ${
        aiBriefing.priority_level === 'CRITICAL_MEDICAL' 
          ? 'bg-red-50 border-red-200 text-red-900' 
          : 'bg-gradient-to-r from-sky-50 to-indigo-50 border-sky-200 text-slate-900'
      }`}>
        <div className={`p-2.5 rounded-xl mt-1 shadow-sm text-white ${
          aiBriefing.priority_level === 'CRITICAL_MEDICAL' ? 'bg-red-600 animate-pulse' : 'bg-sky-600'
        }`}>
          <Sparkles size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
              aiBriefing.priority_level === 'CRITICAL_MEDICAL' ? 'bg-red-200 text-red-800' : 'bg-sky-200 text-sky-800'
            }`}>
              {aiBriefing.priority_level}
            </span>
            <h3 className="font-bold text-base">
              {aiBriefing.headline}
              {summarizing && <span className="text-xs font-normal opacity-75 ml-2 animate-pulse">(Analyzing live telemetry...)</span>}
            </h3>
          </div>
          <p className="text-sm mt-1.5 leading-relaxed font-medium opacity-90">
            "{aiBriefing.summary}"
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'AI Clustered Work Orders', count: totalClusters, icon: FileTextIcon, color: 'text-purple-500', trend: 'Grouped by semantic AI' },
          { title: 'Pending / In Progress', count: inProgressCount, icon: Clock, color: 'text-amber-500', trend: 'Active state response' },
          { title: 'Resolved Work Orders', count: resolvedCount, icon: CheckCircle2, color: 'text-emerald-500', trend: 'Completed clusters' }
        ].map((metric, idx) => (
          <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase">{metric.title}</p>
              <metric.icon size={18} className={metric.color} />
            </div>
            <p className="text-3xl font-bold text-slate-800">{metric.count}</p>
            <p className="text-xs text-slate-400 mt-2 font-medium">{metric.trend}</p>
          </div>
        ))}
      </div>

      {/* Clustered Work Orders Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Send size={18} className="text-purple-600" />
            AI-Aggregated State Work Orders
          </h3>
        </div>

        {loading && clusteredWorkOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">Loading AI clustered state feed...</div>
        ) : clusteredWorkOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-medium">No escalated reports pending from camps right now.</div>
        ) : (
          <div className="overflow-x-auto pb-8">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Relief Camp</th>
                  <th className="px-6 py-4">AI Category</th>
                  <th className="px-6 py-4">Total Qty Needed</th>
                  <th className="px-6 py-4">Cluster Density</th>
                  <th className="px-6 py-4">State Status</th>
                  <th className="px-6 py-4 text-right">State Action Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {clusteredWorkOrders.map((cluster) => (
                  <tr key={cluster.key} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{cluster.camp_name}</td>
                    <td className="px-6 py-4 font-bold text-sky-700">{cluster.category}</td>
                    <td className="px-6 py-4 font-mono font-extrabold text-slate-800 text-base">{cluster.total_quantity}</td>
                    <td className="px-6 py-4">
                      <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-purple-100">
                        {cluster.reports_count} reports merged
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        cluster.latest_status === 'RESOLVED_GOVT' ? 'bg-emerald-100 text-emerald-700' :
                        cluster.latest_status === 'WORK_IN_PROGRESS' ? 'bg-sky-100 text-sky-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {cluster.latest_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => updateClusterGovtStatus(cluster.all_ids, 'WORK_IN_PROGRESS')}
                          className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          In Progress
                        </button>
                        <button 
                          onClick={() => updateClusterGovtStatus(cluster.all_ids, 'RESOLVED_GOVT')}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          Resolve
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FileTextIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <line x1="10" y1="9" x2="8" y2="9"></line>
    </svg>
  );
}