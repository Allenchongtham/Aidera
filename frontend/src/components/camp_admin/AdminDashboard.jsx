import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw, Layers, ChevronDown, ChevronUp, Lock, LogOut, AlertTriangle, Play } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [selectedCampId, setSelectedCampId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeCampName, setActiveCampName] = useState('');
  const [reports, setReports] = useState([]);
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING REVIEW');
  const [expandedClusters, setExpandedClusters] = useState({});

  useEffect(() => {
    const fetchCamps = async () => {
      const { data } = await supabase.from('camps').select('*');
      setCamps(data || []);
      if (data && data.length > 0) setSelectedCampId(data[0].id);
    };
    fetchCamps();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === 'demo123') {
      const camp = camps.find(c => c.id === selectedCampId);
      setActiveCampName(camp ? camp.name : 'Unknown Camp');
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid camp authority password.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPassword('');
    setReports([]);
  };

  const fetchData = async () => {
    if (!isLoggedIn || !selectedCampId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('resident_reports')
        .select('*')
        .eq('camp_id', selectedCampId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
      const subscription = supabase
        .channel(`public:resident_reports:camp_${selectedCampId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'resident_reports',
          filter: `camp_id=eq.${selectedCampId}`
        }, payload => {
          setReports(prev => [payload.new, ...prev]);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isLoggedIn, selectedCampId]);

  const updateReportStatus = async (id, newReviewStatus) => {
    try {
      const updates = { review_status: newReviewStatus };
      if (newReviewStatus === 'ESCALATED_GOVT') {
        updates.govt_status = 'LOOKING_INTO_IT';
      }
      const { error } = await supabase.from('resident_reports').update(updates).eq('id', id);
      if (error) throw error;
      setReports(prev => prev.map(rep => rep.id === id ? { ...rep, ...updates } : rep));
    } catch (err) {
      console.error("Error updating review status:", err);
      alert("Failed to update report workflow.");
    }
  };

  const batchUpdateCluster = async (reportIds, newReviewStatus) => {
    try {
      const updates = { review_status: newReviewStatus };
      if (newReviewStatus === 'ESCALATED_GOVT') {
        updates.govt_status = 'LOOKING_INTO_IT';
      }
      for (const id of reportIds) {
        await supabase.from('resident_reports').update(updates).eq('id', id);
      }
      setReports(prev => prev.map(rep => reportIds.includes(rep.id) ? { ...rep, ...updates } : rep));
    } catch (err) {
      console.error("Batch update error:", err);
      alert("Failed to batch update cluster.");
    }
  };

  const toggleExpand = (clusterKey) => {
    setExpandedClusters(prev => ({ ...prev, [clusterKey]: !prev[clusterKey] }));
  };

  const analyzeClusterUrgency = (cluster) => {
    const criticalKeywords = ['child', 'children', 'baby', 'elderly', 'old', 'medical', 'medicine', 'sick', 'fever', 'toilet', 'sanitation', 'water', 'health'];
    let isMandatory = false;
    const items = new Set();

    if (cluster.category === 'Medical' || cluster.category === 'Sanitation') {
      isMandatory = true;
    }

    cluster.reports.forEach(r => {
      items.add(r.specific_item || r.category);
      const text = `${r.raw_input} ${r.specific_item}`.toLowerCase();
      if (criticalKeywords.some(kw => text.includes(kw))) {
        isMandatory = true;
      }
    });

    const uniqueItems = Array.from(items).join(', ');
    if (isMandatory) {
      return {
        isCritical: true,
        summary: `CRITICAL PRIORITY: This cluster contains severe health, sanitation, or vulnerable demographic needs (${uniqueItems}). State escalation is highly recommended to prevent outbreaks or medical emergencies.`
      };
    }

    return {
      isCritical: false,
      summary: `Standard logistics summary: Aggregated local demand for (${uniqueItems}). Suitable for public donation hub.`
    };
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-slate-900">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 border border-indigo-100">
            <Lock size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center mb-2">Camp Authority Login</h2>
        <p className="text-center text-sm text-slate-600 mb-6">
          Secure access for relief camp managers.
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Select Relief Camp
            </label>
            <select
              value={selectedCampId}
              onChange={(e) => setSelectedCampId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:border-indigo-500 focus:bg-white outline-none font-medium transition-all"
            >
              {camps.map(camp => (
                <option key={camp.id} value={camp.id}>{camp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              Authority Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter demo password: demo123"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white outline-none transition-all"
            />
          </div>

          {loginError && <p className="text-rose-600 text-xs font-bold">{loginError}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-colors shadow-md shadow-indigo-100"
          >
            Access Dashboard
          </button>
        </form>
      </div>
    );
  }

  const filteredReports = reports.filter(r => {
    if (filter === 'ALL') return true;
    return r.review_status === filter;
  });

  const clustersMap = {};
  filteredReports.forEach(report => {
    const cat = report.category || 'Food';
    const clusterKey = `${selectedCampId}_${cat}`;
    if (!clustersMap[clusterKey]) {
      clustersMap[clusterKey] = {
        key: clusterKey,
        category: cat,
        total_quantity: 0,
        reports: []
      };
    }
    clustersMap[clusterKey].total_quantity += (report.quantity || 1);
    clustersMap[clusterKey].reports.push(report);
  });

  const clusterList = Object.values(clustersMap);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-violet-600" size={24} />
            <h1 className="text-xl font-bold text-slate-900">{activeCampName} Console</h1>
          </div>
          <p className="text-slate-600 text-sm mt-1">
            Review isolated AI clusters and ground reality for your camp only.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 bg-slate-50 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Sync
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            {[
              { id: 'PENDING REVIEW', label: 'Pending' },
              { id: 'APPROVED_PUBLIC', label: 'Published to Map' },
              { id: 'ESCALATED_GOVT', label: 'Escalated to State' },
              { id: 'ALL', label: 'All' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filter === tab.id
                    ? 'bg-white text-indigo-600 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Cluster Feed */}
      <div className="space-y-4">
        {loading && reports.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            Loading {activeCampName} feed...
          </div>
        ) : clusterList.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 font-medium">
            No clusters found for filter: {filter}
          </div>
        ) : (
          clusterList.map((cluster) => {
            const isExpanded = expandedClusters[cluster.key];
            const reportIds = cluster.reports.map(r => r.id);
            const allPending = cluster.reports.every(r => r.review_status === 'PENDING REVIEW');
            const urgencyAnalysis = analyzeClusterUrgency(cluster);
            const isImportantCategory = ['medical', 'sanitation'].includes(cluster.category?.toLowerCase());

            return (
              <div
                key={cluster.key}
                className={`rounded-2xl shadow-xl border overflow-hidden transition-all ${
                  isImportantCategory
                    ? 'bg-violet-500/20 border-violet-300'
                    : urgencyAnalysis.isCritical && allPending
                    ? 'bg-white border-violet-400'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Cluster Header */}
                <div
                  className={`p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b ${
                    isImportantCategory
                      ? 'bg-viole-500/10 border-violet-200/60'
                      : urgencyAnalysis.isCritical && allPending
                      ? 'bg-violet-50/70 border-violet-100'
                      : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2.5 rounded-xl mt-0.5 ${
                        urgencyAnalysis.isCritical
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-600 text-white shadow-xs'
                      }`}
                    >
                      {urgencyAnalysis.isCritical ? <AlertTriangle size={22} /> : <Layers size={22} />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-lg">
                          {cluster.category} Cluster
                        </span>
                        <span className="bg-indigo-50 text-indigo-600 border border-indigo-200 px-2.5 py-0.5 rounded-full text-xs font-bold">
                          {cluster.reports.length} Reports
                        </span>
                        <span className="bg-white text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold">
                          Total Qty: {cluster.total_quantity}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {allPending && (
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => batchUpdateCluster(reportIds, 'APPROVED_PUBLIC')}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                        >
                          Publish to Public Map
                        </button>
                        <button
                          onClick={() => batchUpdateCluster(reportIds, 'ESCALATED_GOVT')}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs ${
                            urgencyAnalysis.isCritical
                              ? 'bg-violet-600 hover:bg-violet-700 text-white animate-pulse'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          Escalate to State Govt
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleExpand(cluster.key)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-700 hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Individual Reports Breakdown */}
                {isExpanded && (
                  <div className={`divide-y ${isImportantCategory ? 'divide-violet-200/50 bg-white/60' : 'divide-slate-100 bg-white'}`}>
                    {cluster.reports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-white/80 transition-colors"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">
                              {report.resident_name || 'Anonymous'}
                            </span>
                            <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 rounded font-medium">
                              Tent: {report.tent_number || 'N/A'}
                            </span>
                            <span className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 rounded font-bold">
                              Qty: {report.quantity || 1}
                            </span>
                          </div>
                          <p className="text-sm italic text-slate-700">"{report.raw_input}"</p>
                          <p className="text-xs text-slate-500 font-medium">
                            Item: {report.specific_item || report.category}
                          </p>

                          {report.audio_url && (
                            <div className="pt-2">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase mb-1 flex items-center gap-1">
                                <Play size={12} className="fill-indigo-600" /> Resident Voice Note:
                              </span>
                              <audio controls className="h-8 w-full max-w-sm">
                                <source src={report.audio_url} type="audio/webm" />
                                Your browser does not support the audio element.
                              </audio>
                            </div>
                          )}
                        </div>

                        {report.review_status === 'PENDING REVIEW' && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => updateReportStatus(report.id, 'APPROVED_PUBLIC')}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                            >
                              To Public Map
                            </button>
                            <button
                              onClick={() => updateReportStatus(report.id, 'ESCALATED_GOVT')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                            >
                              To State Govt
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}