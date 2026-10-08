import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Package, RefreshCw, ChevronDown, ChevronUp, HeartHandshake, PhoneCall, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function PublicMap() {
  const centerPosition = [24.8170, 93.9368];
  const [camps, setCamps] = useState([]);
  const [approvedReports, setApprovedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [activeSponsorCampId, setActiveSponsorCampId] = useState(null);

  const [resolvingCampKey, setResolvingCampKey] = useState(null);
  const [resolvePassword, setResolvePassword] = useState('');
  const [resolveError, setResolveError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: campsData } = await supabase.from('camps').select('*');
      setCamps(campsData || []);

      const { data: reportsData } = await supabase
        .from('resident_reports')
        .select('*')
        .eq('review_status', 'APPROVED_PUBLIC');

      setApprovedReports(reportsData || []);
    } catch (err) {
      console.error("Error loading public map data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel('public:map_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resident_reports' }, () => {
        fetchData();
      })
      .subscribe();

    return () => supabase.removeChannel(subscription);
  }, []);

  const campMap = {};
  camps.forEach(c => { campMap[c.id] = c.name; });

  const categoryMap = {};
  approvedReports.forEach(report => {
    const cat = report.category || 'Food';
    const campId = report.camp_id;
    const campName = campMap[campId] || 'Relief Camp';

    if (!categoryMap[cat]) {
      categoryMap[cat] = { category: cat, total_reports: 0, camps_map: {} };
    }

    categoryMap[cat].total_reports += 1;

    if (!categoryMap[cat].camps_map[campId]) {
      categoryMap[cat].camps_map[campId] = {
        camp_id: campId,
        camp_name: campName,
        total_quantity: 0,
        request_count: 0,
        report_ids: [],
        specific_items: new Set()
      };
    }

    categoryMap[cat].camps_map[campId].total_quantity += (report.quantity || 1);
    categoryMap[cat].camps_map[campId].request_count += 1;
    categoryMap[cat].camps_map[campId].report_ids.push(report.id);
    categoryMap[cat].camps_map[campId].specific_items.add(report.specific_item || cat);
  });

  const categoryList = Object.values(categoryMap).map(cat => ({
    ...cat,
    camps_involved: Object.values(cat.camps_map).map(c => ({
      ...c,
      specific_items_str: Array.from(c.specific_items).join(', ')
    }))
  }));

  const toggleExpand = (catName) => {
    setExpandedCategory(prev => prev === catName ? null : catName);
    setActiveSponsorCampId(null);
    setResolvingCampKey(null);
  };

  const toggleSponsorPanel = (campKey) => {
    setActiveSponsorCampId(prev => prev === campKey ? null : campKey);
    setResolvingCampKey(null);
  };

  const openResolvePanel = (campKey) => {
    setResolvingCampKey(campKey);
    setActiveSponsorCampId(null);
    setResolvePassword('');
    setResolveError('');
  };

  const handleResolveSubmit = async (reportIds) => {
    if (resolvePassword !== 'demo123') {
      setResolveError('Invalid Admin Password');
      return;
    }

    try {
      for (const id of reportIds) {
        await supabase
          .from('resident_reports')
          .update({ review_status: 'FULFILLED' })
          .eq('id', id);
      }

      setApprovedReports(prev => prev.filter(r => !reportIds.includes(r.id)));
      setResolvingCampKey(null);
      setResolvePassword('');
    } catch (err) {
      console.error("Error resolving reports:", err);
      setResolveError('Failed to resolve. Try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col text-slate-900">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold">Statewide Relief & Donation Hub</h2>
          <p className="text-sm text-slate-600">
            Select specific camp deficits to coordinate donations directly with camp authorities.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors bg-white shadow-xs"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Hub
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        {/* Left: Map */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-0 relative">
          <MapContainer center={centerPosition} zoom={10} className="w-full h-full">
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {camps.map(camp => {
              if (!camp.lat || !camp.lng) return null;
              const campReportsCount = approvedReports.filter(r => r.camp_id === camp.id).length;
              if (campReportsCount === 0) return null;
              return (
                <CircleMarker
                  key={camp.id}
                  center={[camp.lat, camp.lng]}
                  pathOptions={{ color: '#4F46E5', fillColor: '#6366F1', fillOpacity: 0.8 }}
                  radius={16}
                >
                  <Popup>
                    <div className="font-sans p-1">
                      <h3 className="font-bold text-slate-900 text-base">{camp.name}</h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Verified Active Requests: {campReportsCount}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>
        </div>

        {/* Right: Donation List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col min-h-0">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2 text-slate-900">
              <HeartHandshake size={18} className="text-indigo-600" /> Prioritized Relief Categories
            </h3>
            <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              {categoryList.length} Categories Active
            </span>
          </div>

          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {categoryList.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-sm font-medium">
                No approved relief deficits currently listed.
              </div>
            ) : (
              categoryList.map(item => {
                const isExpanded = expandedCategory === item.category;
                return (
                  <div key={item.category} className="rounded-2xl border border-slate-200 bg-slate-50/50 shadow-xs transition-all overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white text-indigo-600 border border-slate-200 shadow-xs">
                          <Package size={22} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-slate-900 text-base">{item.category}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {item.camps_involved.length} Relief Camp(s) Impacted
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-2xl font-mono font-extrabold text-indigo-600">
                          {item.total_reports}
                        </span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">Requests</span>
                      </div>
                    </div>

                    <div className="p-3 bg-white border-t border-slate-200/80 flex items-center justify-between gap-2">
                      <button
                        onClick={() => toggleExpand(item.category)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded transition-colors w-full justify-between"
                      >
                        {isExpanded ? 'Hide Request Breakdown' : 'View Request Breakdown'}
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="bg-slate-100/60 border-t border-slate-200 p-3 space-y-3">
                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                          Verified Needs by Camp
                        </div>
                        {item.camps_involved.map((campGroup) => {
                          const campKey = `${item.category}_${campGroup.camp_id}`;
                          const isSponsorOpen = activeSponsorCampId === campKey;
                          const isResolving = resolvingCampKey === campKey;

                          return (
                            <div key={campGroup.camp_id} className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
                              <div className="flex justify-between items-center gap-2 flex-wrap">
                                <div>
                                  <span className="font-bold text-slate-900 text-sm block">{campGroup.camp_name}</span>
                                  <span className="text-xs text-slate-600 font-medium mt-0.5 block">
                                    {campGroup.specific_items_str} ({campGroup.request_count} household request(s))
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openResolvePanel(campKey)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                                  >
                                    Resolve
                                  </button>
                                  <button
                                    onClick={() => toggleSponsorPanel(campKey)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                      isSponsorOpen
                                        ? 'bg-emerald-800 text-white'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    }`}
                                  >
                                    Sponsor
                                  </button>
                                </div>
                              </div>

                              {isSponsorOpen && (
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col gap-1 text-emerald-900">
                                  <div className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs mb-0.5">
                                    <PhoneCall size={14} /> Contact Camp Administration
                                  </div>
                                  <div className="text-xs">Nodal Officer: Demo Camp Coordinator</div>
                                  <div className="text-xs">
                                    Emergency Line: <span className="font-mono font-bold text-emerald-800">+91 98560 00000</span>
                                  </div>
                                  <div className="text-[10px] text-emerald-600 italic mt-1 border-t border-emerald-200 pt-1">
                                    Coordinate bulk delivery directly with camp authorities.
                                  </div>
                                </div>
                              )}

                              {isResolving && (
                                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                                  <input
                                    type="password"
                                    placeholder="Admin Password (demo123)"
                                    value={resolvePassword}
                                    onChange={(e) => setResolvePassword(e.target.value)}
                                    className="flex-1 p-2 text-xs bg-white text-slate-900 border border-slate-200 rounded-lg focus:border-indigo-500 outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleResolveSubmit(campGroup.report_ids)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg flex items-center justify-center transition-colors"
                                    title="Confirm Resolve"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                  <button
                                    onClick={() => setResolvingCampKey(null)}
                                    className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg flex items-center justify-center transition-colors hover:bg-slate-100"
                                    title="Cancel"
                                  >
                                    <X size={16} />
                                  </button>
                                </div>
                              )}

                              {isResolving && resolveError && (
                                <div className="text-rose-600 text-[10px] font-bold mt-1">{resolveError}</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}