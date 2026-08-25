import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/common/Navbar';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  User, 
  Phone, 
  Building,
  RefreshCw
} from 'lucide-react';

export default function SecurityDashboard() {
  const { user } = useAuth();
  const [searchRoll, setSearchRoll] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gateLogs, setGateLogs] = useState([]);
  const [actionSuccess, setActionSuccess] = useState('');

  const loadLogs = async () => {
    try {
      const res = await api.getGateLogs(20);
      setGateLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to load gate logs:', err);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!searchRoll.trim()) return;

    setLoading(true);
    setVerificationResult(null);
    setActionSuccess('');

    try {
      const res = await api.verifyPass({ roll_no: searchRoll.trim() });
      setVerificationResult(res);
    } catch (err) {
      setVerificationResult({
        valid: false,
        verificationStatus: 'NOT_FOUND',
        message: err.message || 'No valid out-pass found for this roll number.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGateAction = async (action) => {
    if (!verificationResult?.outpass?.id) return;
    try {
      const res = await api.gateAction({
        outpass_id: verificationResult.outpass.id,
        action
      });
      setActionSuccess(res.message);
      loadLogs();
      // Re-verify to update status
      handleVerify();
    } catch (err) {
      alert(err.message);
    }
  };

  const isApproved = verificationResult?.valid && verificationResult?.allowedAction === 'checkout';
  const isCheckedOut = verificationResult?.valid && verificationResult?.allowedAction === 'checkin';

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Header */}
        <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-emerald-400" />
              <h1 className="text-xl font-bold text-white">Main Gate Pass Verification Portal</h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">Instant QR Code & Student Roll Number Checkpoint</p>
          </div>
          <div className="px-3 py-1.5 bg-slate-700/80 rounded-xl text-xs text-slate-300 font-mono">
            Security Station #1 (Main Arch Gate)
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: Search & Verification Banner */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Search Box */}
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Scan QR or Search Student Roll Number
              </label>
              <form onSubmit={handleVerify} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    placeholder="Enter Roll No (e.g. 22CS101)"
                    value={searchRoll}
                    onChange={(e) => setSearchRoll(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  {loading ? 'Checking...' : 'Verify Pass'}
                </button>
              </form>

              <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
                <span>Quick Test:</span>
                <button
                  type="button"
                  onClick={() => { setSearchRoll('22CS101'); }}
                  className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[11px] font-mono text-emerald-400"
                >
                  22CS101 (Approved)
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchRoll('22CS102'); }}
                  className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 rounded text-[11px] font-mono text-amber-400"
                >
                  22CS102 (Pending)
                </button>
              </div>
            </div>

            {/* VERIFICATION RESULT BANNER */}
            {verificationResult && (
              <div className={`rounded-2xl p-6 border shadow-xl space-y-4 ${
                verificationResult.valid 
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-100' 
                  : 'bg-red-950/40 border-red-500/50 text-red-100'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider ${
                    verificationResult.valid ? 'bg-emerald-500 text-slate-950' : 'bg-red-500 text-white'
                  }`}>
                    {verificationResult.verificationStatus}
                  </span>
                  <span className="text-xs opacity-75">{new Date().toLocaleTimeString()}</span>
                </div>

                <div className="text-sm font-semibold leading-relaxed">
                  {verificationResult.message}
                </div>

                {/* Student Details Card */}
                {verificationResult.outpass && (
                  <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700 space-y-2 text-xs text-slate-300">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Student: <strong className="text-white">{verificationResult.outpass.student_name}</strong></div>
                      <div>Roll No: <strong className="text-emerald-400 font-mono">{verificationResult.outpass.student_roll_no}</strong></div>
                      <div>Room: <strong className="text-white">{verificationResult.outpass.room_number || '204'}</strong></div>
                      <div>Parent Phone: <strong className="text-white">{verificationResult.outpass.parent_phone}</strong></div>
                    </div>
                    <div className="pt-2 border-t border-slate-800">
                      <div>Destination: <strong className="text-white">{verificationResult.outpass.destination}</strong></div>
                      <div>Reason: <span className="text-slate-400">{verificationResult.outpass.reason}</span></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {actionSuccess && (
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-lg text-xs font-semibold">
                    ✓ {actionSuccess}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {isApproved && (
                    <button
                      onClick={() => handleGateAction('checkout')}
                      className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <ArrowUpRight className="w-5 h-5" /> RECORD CHECK-OUT (EXIT CAMPUS)
                    </button>
                  )}

                  {isCheckedOut && (
                    <button
                      onClick={() => handleGateAction('checkin')}
                      className="flex-1 py-3 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                    >
                      <ArrowDownLeft className="w-5 h-5" /> RECORD CHECK-IN (ENTRY CAMPUS)
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* RIGHT: Live Gate Movement Register */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" /> Recent Gate Movements
                </h3>
                <button onClick={loadLogs} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {gateLogs.length === 0 ? (
                  <div className="text-xs text-slate-400 text-center py-6">No movement logs recorded yet today</div>
                ) : (
                  gateLogs.map((log) => (
                    <div key={log.id} className="p-3 bg-slate-900/60 rounded-xl border border-slate-700/60 text-xs flex justify-between items-center">
                      <div>
                        <div className="font-bold text-white">{log.student_name} <span className="text-[10px] text-slate-400 font-mono">({log.student_roll_no})</span></div>
                        <div className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleTimeString()} • Room {log.room_number || '204'}</div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'checkout' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {log.action.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
