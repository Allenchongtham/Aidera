import React, { useState, useEffect, useRef } from 'react';
import { Mic, Shield, CheckCircle2, Copy, Loader2, Square, Sparkles, Search, FileText, Send, MapPin, CheckCircle, AlertTriangle, RefreshCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ReportForm() {
  const [camps, setCamps] = useState([]);
  const [formData, setFormData] = useState({
    camp_id: '',
    resident_name: '',
    tent_number: ''
  });
  
  const [text, setText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedId, setGeneratedId] = useState('');
  const [rateLimitMessage, setRateLimitMessage] = useState('');
  
  // Tracking State
  const [trackingId, setTrackingId] = useState('');
  const [trackingResult, setTrackingResult] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  
  // Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordedBlobRef = useRef(null);

  useEffect(() => {
    async function fetchCamps() {
      const { data, error } = await supabase.from('camps').select('*');
      if (data && data.length > 0) {
        setCamps(data);
        setFormData(prev => ({ ...prev, camp_id: data[0].id }));
      }
      if (error) console.error("Error fetching camps:", error);
    }
    fetchCamps();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === 'resident_name' || name === 'tent_number') {
      setRateLimitMessage('');
    }
  };

  const resetDemoRateLimit = () => {
    localStorage.removeItem('aidera_resident_submissions');
    setRateLimitMessage('');
    alert("Demo Rate-Limit Cleared! You can now submit again.");
  };

  const startRecording = async () => {
    audioChunksRef.current = [];
    recordedBlobRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        recordedBlobRef.current = audioBlob;
        await sendAudioToWhisper(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please check your browser permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const sendAudioToWhisper = async (audioBlob) => {
    setIsTranscribing(true);
    const audioForm = new FormData();
    audioForm.append("file", audioBlob, "voice_grievance.webm");

    try {
      const response = await fetch('http://localhost:8000/api/audio/transcribe', {
        method: 'POST',
        body: audioForm
      });

      if (!response.ok) throw new Error('Transcription failed.');

      const data = await response.json();
      setText(prev => (prev + ' ' + data.text).trim());
    } catch (error) {
      console.error("Whisper error:", error);
      alert("Failed to transcribe audio through Whisper API.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.camp_id || !formData.resident_name || !formData.tent_number || !text) {
      alert("Please complete all identification fields and provide a grievance detail.");
      return;
    }

    const storageKey = 'aidera_resident_submissions';
    const existingSubmissions = JSON.parse(localStorage.getItem(storageKey) || '{}');
    const residentKey = `${formData.resident_name.trim().toLowerCase()}_${formData.tent_number.trim().toLowerCase()}`;
    
    const lastSubmissionTime = existingSubmissions[residentKey];
    if (lastSubmissionTime) {
      const hoursPassed = (Date.now() - lastSubmissionTime) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        setRateLimitMessage(`Submission Blocked: Household "${formData.resident_name}" (Tent: ${formData.tent_number}) has already submitted a report within the last 24 hours. Please use the Status Tracker below.`);
        return;
      }
    }

    setIsSubmitting(true);
    setRateLimitMessage('');

    try {
      const response = await fetch('http://localhost:8000/api/reports/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          camp_id: formData.camp_id,
          resident_name: formData.resident_name,
          tent_number: formData.tent_number,
          raw_input: text,
          category: 'AI_AUTONOMOUS'
        })
      });

      if (!response.ok) throw new Error('Failed to process report.');

      const { data: latestReport, error: fetchError } = await supabase
        .from('resident_reports')
        .select('id')
        .eq('camp_id', formData.camp_id)
        .eq('resident_name', formData.resident_name)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !latestReport) {
        throw new Error('Report ingested, but failed to fetch reference UUID.');
      }

      // If audio was recorded, convert to base64 and update Supabase row with audio_url
      if (recordedBlobRef.current) {
        const audioBase64 = await blobToBase64(recordedBlobRef.current);
        await supabase
          .from('resident_reports')
          .update({ audio_url: audioBase64 })
          .eq('id', latestReport.id);
      }

      existingSubmissions[residentKey] = Date.now();
      localStorage.setItem(storageKey, JSON.stringify(existingSubmissions));

      setGeneratedId(latestReport.id);
      setIsSubmitting(false);
      setIsSubmitted(true);

    } catch (error) {
      console.error("Backend error:", error);
      setIsSubmitting(false);
      alert("Failed to submit report. Ensure backend and Supabase are connected.");
    }
  };

  const handleTrackRequest = async (e) => {
    e.preventDefault();
    if (!trackingId.trim()) return;

    setIsTracking(true);
    setTrackingError('');
    setTrackingResult(null);

    try {
      const { data, error } = await supabase
        .from('resident_reports')
        .select(`
          id, 
          created_at, 
          review_status, 
          category, 
          specific_item,
          govt_status,
          camp_id,
          camps (name)
        `)
        .eq('id', trackingId.trim())
        .single();

      if (error) throw error;
      setTrackingResult(data);
    } catch (err) {
      setTrackingError("Report ID not found. Please verify the full reference ID and try again.");
    } finally {
      setIsTracking(false);
    }
  };

  const getTimelineSteps = (status, govtStatus) => {
    const steps = [
      { id: 'submitted', label: 'Report Logged', icon: <FileText size={16} />, active: true },
      { id: 'admin', label: 'Admin Reviewed', icon: <Search size={16} />, active: ['APPROVED_PUBLIC', 'ESCALATED_GOVT', 'FULFILLED'].includes(status) },
      { id: 'action', label: 'Action Initiated', icon: <Send size={16} />, active: ['APPROVED_PUBLIC', 'ESCALATED_GOVT', 'FULFILLED'].includes(status) },
      { id: 'resolved', label: 'Resolved / Fulfilled', icon: <CheckCircle2 size={16} />, active: status === 'FULFILLED' }
    ];

    if (status === 'ESCALATED_GOVT') {
      steps[2] = { id: 'action', label: 'Escalated to State', icon: <AlertTriangle size={16} className="text-purple-500" />, active: true };
      if (govtStatus === 'RESOLVED_GOVT' || govtStatus === 'RESOLVED') {
         steps[3] = { id: 'resolved', label: 'State Deployed Aid', icon: <CheckCircle size={16} className="text-emerald-500" />, active: true };
      }
    }

    if (status === 'APPROVED_PUBLIC') {
       steps[2] = { id: 'action', label: 'Public Map Pledged', icon: <MapPin size={16} className="text-sky-500" />, active: true };
    }

    return steps;
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto mt-10 bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
        <CheckCircle2 className="text-emerald-500 mx-auto mb-4" size={48} />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Submitted</h2>
        <p className="text-slate-500 text-sm mb-8">Your report has been received and automatically categorized by our AI triage engine.</p>
        
        <div className="bg-slate-50 rounded-lg p-5 border border-slate-200 mb-8 shadow-inner">
          <p className="text-xs font-bold text-slate-500 uppercase mb-2 tracking-wider">Save Your Reference ID</p>
          <div className="flex items-center justify-center gap-3 bg-white border border-slate-300 rounded-md py-3 px-4">
            <span className="text-xs font-mono font-extrabold text-sky-700 truncate max-w-[220px]">{generatedId}</span>
            <button 
              onClick={() => navigator.clipboard.writeText(generatedId)}
              className="text-slate-400 hover:text-sky-600 transition-colors shrink-0"
              title="Copy ID"
            >
              <Copy size={18} />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-3 italic">Use this ID in the Tracker below to check your status.</p>
        </div>

        <div className="flex flex-col gap-2">
          <button 
            onClick={() => { setIsSubmitted(false); setText(''); recordedBlobRef.current = null; }}
            className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-lg transition-colors text-sm"
          >
            Submit Another Request
          </button>
          <button 
            onClick={resetDemoRateLimit}
            className="text-xs text-slate-400 hover:text-sky-600 underline mt-2"
          >
            [Demo Mode] Clear Rate-Limit Lock
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-sky-900 flex items-center gap-2">
            <Mic size={22} className="text-sky-600" /> 
            Citizen Grievance & Reporting Portal[cite: 13]
          </h1>
          <p className="text-sky-700 text-xs mt-0.5">Submit needs directly to camp authorities via AI voice transcription or track existing reports[cite: 13].</p>
        </div>
        <button 
          onClick={resetDemoRateLimit}
          className="text-[11px] bg-white border border-sky-200 text-sky-700 px-3 py-1.5 rounded-lg font-bold shadow-sm hover:bg-sky-100 transition-colors flex items-center gap-1.5 shrink-0"
        >
          <RefreshCcw size={12} /> Clear Rate-Limit Lock
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative">
        
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
            <Shield className="text-sky-600" size={18} />
            <h2 className="font-bold text-slate-800 text-sm">1. Camp Identification</h2>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Select Relief Camp *</label>
            <select name="camp_id" value={formData.camp_id} onChange={handleInputChange} className="w-full mt-1 border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:border-sky-500">
              {camps.map(camp => <option key={camp.id} value={camp.id}>{camp.name}</option>)}
            </select>
          </div>
          
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Resident Profile (Tier 1 Private)</label>
            <div className="space-y-3">
              <input type="text" name="resident_name" value={formData.resident_name} onChange={handleInputChange} placeholder="Head of Household Name" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:border-sky-500" />
              <input type="text" name="tent_number" value={formData.tent_number} onChange={handleInputChange} placeholder="Tent / Block Number" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-slate-50 outline-none focus:border-sky-500" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
           <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-2">
            <h2 className="font-bold text-slate-800 text-sm">2. Grievance Input</h2>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-100 uppercase tracking-wider">
              <Sparkles size={10} /> AI Classified
            </span>
          </div>
          
          <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 mb-2">
            <button 
              type="button"
              onClick={toggleRecording}
              className={`h-12 w-12 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
                isRecording ? 'bg-red-500 animate-pulse ring-4 ring-red-200' : 'bg-sky-600 hover:bg-sky-700'
              }`}
            >
              {isRecording ? <Square size={18} /> : <Mic size={22} />}
            </button>
            <p className="text-xs text-slate-500 mt-2 font-semibold text-center">
              {isRecording ? 'Listening... tap to stop' : isTranscribing ? 'Processing Whisper AI...' : 'Tap to speak securely in Manipuri or English'}
            </p>
            {isTranscribing && <Loader2 className="animate-spin text-sky-600 mt-2" size={16} />}
          </div>

          <textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Or type here (e.g., 'We need 3 winter blankets and baby food')..."
            className="w-full border border-slate-300 rounded-lg p-3 text-sm outline-none focus:border-sky-500 h-20 resize-none bg-slate-50"
          />

          {rateLimitMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold">
              {rateLimitMessage}
            </div>
          )}

          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || isTranscribing}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" /> Processing Triage...</> : 'Submit to Authorities'}
          </button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
          <Search className="text-slate-600" size={18} />
          <h2 className="font-bold text-slate-800 text-sm">Track My Request</h2>
        </div>

        <form onSubmit={handleTrackRequest} className="flex gap-3 mb-6 max-w-2xl">
          <div className="flex-1">
            <input 
              type="text" 
              value={trackingId}
              onChange={(e) => setTrackingId(e.target.value)}
              placeholder="Paste full Reference ID UUID here..." 
              className="w-full border border-slate-300 rounded-lg p-2.5 text-xs bg-slate-50 outline-none focus:border-sky-500 font-mono" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isTracking || !trackingId}
            className="bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 text-white px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold shadow-sm shrink-0"
          >
            {isTracking ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>Track Status</span>
          </button>
        </form>
        {trackingError && <p className="text-red-500 text-xs font-bold mb-4">{trackingError}</p>}

        {trackingResult ? (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 pb-4 border-b border-slate-200 gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2.5 py-0.5 rounded uppercase tracking-wider">
                    {trackingResult.category}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">• {trackingResult.camps?.name}</span>
                </div>
                <h4 className="font-bold text-base text-slate-900">{trackingResult.specific_item}</h4>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-white px-3 py-1 rounded border border-slate-200">
                Logged: {new Date(trackingResult.created_at).toLocaleDateString()}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              {getTimelineSteps(trackingResult.review_status, trackingResult.govt_status).map((step, index) => (
                <div key={step.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3 relative">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0 ${
                    step.active ? 'border-sky-500 bg-sky-50 text-sky-600' : 'border-slate-300 bg-slate-50 text-slate-300'
                  }`}>
                    {step.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Step {index + 1}</span>
                    <h5 className={`font-bold text-xs mt-0.5 ${step.active ? 'text-slate-800' : 'text-slate-400'}`}>{step.label}</h5>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-slate-400 py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            <p className="text-xs font-medium">Enter your reference ID above to audit real-time processing and logistics timeline.</p>
          </div>
        )}

      </div>

    </div>
  );
}