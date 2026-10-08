import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, AlertCircle, ShieldCheck, Activity, RefreshCw, Send, Sparkles, X, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function GovtPortal() {
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
      if (data.headline) setAiBriefing(data);
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

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 border border-slate-200 shadow-xl rounded-2xl text-center text-slate-900">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">State Authority Access</h2>
        <p className="text-sm text-slate-600 mb-6">
          Enter the government nodal officer password to view live telemetry and manage escalated work orders.
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="Enter Password (demo123)"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              className="w-full p-3 border border-slate-200 bg-slate-50 text-slate-900 rounded-xl focus:border-indigo-500 text-center font-mono outline-none"
              autoFocus
            />
          </div>
          {loginError && <p className="text-rose-600 text-xs font-bold">{loginError}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-indigo-100"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  const campMap = {};
  camps.forEach(c => { campMap[c.id] = c.name; });

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
  const totalClusters = clusteredWorkOrders.length;
  const inProgressCount = clusteredWorkOrders.filter(w => w.latest_status !== 'RESOLVED_GOVT').length;
  const resolvedCount = clusteredWorkOrders.filter(w => w.latest_status === 'RESOLVED_GOVT').length;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center text-slate-900">
        <div>
          <h2 className="text-2xl font-bold">Government State Portal</h2>
          <p className="text-sm text-slate-600">
            AI-clustered cross-camp work orders, situational briefs, and state coordination.
          </p>
        </div>
        <button
          onClick={fetchGovtData}
          className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold shadow-xs hover:bg-slate-50 flex items-center gap-2"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync State Feed
        </button>
      </div>

      {/* AI Integrated Dynamic Intelligence Banner */}
      <div className="bg-violet-500/10 backdrop-blur-md border border-violet-200/80 text-violet-950 rounded-2xl p-6 flex items-start gap-4 shadow-xs">
        <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-200 shrink-0 text-violet-700">
          <Sparkles size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-violet-600 text-white shadow-xs">
              {aiBriefing.priority_level}
            </span>
            <h3 className="font-bold text-base text-violet-900">
              {aiBriefing.headline}
              {summarizing && (
                <span className="text-xs font-normal opacity-80 ml-2 animate-pulse text-violet-600">
                  (Analyzing live telemetry...)
                </span>
              )}
            </h3>
          </div>
          <p className="text-sm mt-2 leading-relaxed font-medium text-violet-800">
            "{aiBriefing.summary}"
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { title: 'AI Clustered Work Orders', count: totalClusters, color: 'text-indigo-600', trend: 'Grouped by semantic AI' },
          { title: 'Pending / In Progress', count: inProgressCount, color: 'text-amber-600', trend: 'Active state response' },
          { title: 'Resolved Work Orders', count: resolvedCount, color: 'text-emerald-600', trend: 'Completed clusters' }
        ].map((metric, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{metric.title}</p>
            <p className={`text-3xl font-bold mt-2 ${metric.color}`}>{metric.count}</p>
            <p className="text-xs text-slate-500 mt-2 font-medium">{metric.trend}</p>
          </div>
        ))}
      </div>

      {/* Clustered Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold flex items-center gap-2 text-slate-900">
            <Send size={18} className="text-indigo-600" /> AI-Aggregated State Work Orders
          </h3>
        </div>

        {loading && clusteredWorkOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">Loading AI clustered state feed...</div>
        ) : clusteredWorkOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">No escalated reports pending from camps right now.</div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold">Relief Camp</th>
                  <th className="px-6 py-4 font-bold">AI Category</th>
                  <th className="px-6 py-4 font-bold">Total Qty Needed</th>
                  <th className="px-6 py-4 font-bold">Cluster Density</th>
                  <th className="px-6 py-4 font-bold">State Status</th>
                  <th className="px-6 py-4 text-right font-bold">State Action Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clusteredWorkOrders.map((cluster) => (
                  <tr key={cluster.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{cluster.camp_name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-1 rounded-md text-xs font-mono font-extrabold">
                        {cluster.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-900 text-base font-mono font-bold">{cluster.total_quantity}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
                        {cluster.reports_count} reports merged
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          cluster.latest_status === 'RESOLVED_GOVT'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : cluster.latest_status === 'WORK_IN_PROGRESS'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {cluster.latest_status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => updateClusterGovtStatus(cluster.all_ids, 'WORK_IN_PROGRESS')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                        >
                          In Progress
                        </button>
                        <button
                          onClick={() => updateClusterGovtStatus(cluster.all_ids, 'RESOLVED_GOVT')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
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