import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/common/Navbar';
import { 
  QrCode, 
  Plus, 
  Wrench, 
  Utensils, 
  Bell, 
  Building, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Hourglass, 
  UserCheck
} from 'lucide-react';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('passes');
  const [myPasses, setMyPasses] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [messMenu, setMessMenu] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showPassModal, setShowPassModal] = useState(false);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedQRPass, setSelectedQRPass] = useState(null);

  const [passForm, setPassForm] = useState({
    pass_type: 'night_out',
    reason: '',
    destination: '',
    out_date: '',
    in_date: ''
  });

  const [complaintForm, setComplaintForm] = useState({
    category: 'electrical',
    title: '',
    description: '',
    priority: 'medium'
  });

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [passesRes, complaintsRes, messRes, noticesRes] = await Promise.all([
        api.getMyPasses(),
        api.getComplaints(),
        api.getMessMenu(),
        api.getNotices()
      ]);
      setMyPasses(passesRes.outpasses || []);
      setComplaints(complaintsRes.complaints || []);
      setMessMenu(messRes.menu || []);
      setNotices(noticesRes.notices || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApplyPass = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await api.applyOutpass(passForm);
      setFormSuccess('Out-pass submitted successfully for Warden approval!');
      setPassForm({
        pass_type: 'night_out',
        reason: '',
        destination: '',
        out_date: '',
        in_date: ''
      });
      setTimeout(() => {
        setShowPassModal(false);
        setFormSuccess('');
        loadData();
      }, 1200);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleFileComplaint = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    try {
      await api.fileComplaint({
        ...complaintForm,
        room_number: user.room_number || 'Room 204'
      });
      setFormSuccess('Maintenance ticket filed successfully.');
      setComplaintForm({
        category: 'electrical',
        title: '',
        description: '',
        priority: 'medium'
      });
      setTimeout(() => {
        setShowComplaintModal(false);
        setFormSuccess('');
        loadData();
      }, 1200);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const handleCancelPass = async (id) => {
    if (window.confirm('Are you sure you want to cancel this pending out-pass?')) {
      try {
        await api.cancelPass(id);
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const groupedMess = messMenu.reduce((acc, item) => {
    acc[item.day_of_week] = acc[item.day_of_week] || [];
    acc[item.day_of_week].push(item);
    return acc;
  }, {});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayName = daysOfWeek[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Approved</span>;
      case 'pending':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1"><Hourglass className="w-3 h-3" /> Pending Review</span>;
      case 'checked_out':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1"><MapPin className="w-3 h-3" /> Outside Campus</span>;
      case 'completed':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Completed</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Profile & Room Info */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-xl font-bold shadow-md">
              {user?.name?.charAt(0) || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{user?.name}</h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                  Roll: {user?.roll_no || '22CS101'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {user?.department} • Year {user?.year_of_study || 3}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="text-slate-400 font-medium">Allocated Room</div>
              <div className="font-bold text-slate-800 text-sm flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                {user?.block_name || 'Aryabhatta Block A'} - Room {user?.room_number || '204'}
              </div>
            </div>

            <button
              onClick={() => setShowPassModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Apply Out-Pass
            </button>

            <button
              onClick={() => setShowComplaintModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <Wrench className="w-4 h-4 text-slate-600" /> File Complaint
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('passes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'passes' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <QrCode className="w-4 h-4" /> Out-Passes & QR ({myPasses.length})
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'complaints' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Wrench className="w-4 h-4" /> Maintenance Tickets ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('mess')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'mess' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Utensils className="w-4 h-4" /> Mess Menu
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'notices' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bell className="w-4 h-4" /> Notices ({notices.length})
          </button>
        </div>

        {/* Tab 1: Out-Passes */}
        {activeTab === 'passes' && (
          <div className="space-y-4">
            {myPasses.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <QrCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-slate-800">No Out-Pass Applications Yet</h3>
                <p className="text-xs text-slate-500 mt-1">Apply for leave and present the QR code at the main gate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myPasses.map((pass) => (
                  <div key={pass.id} className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 hover:border-indigo-200 transition flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                          {pass.pass_type.replace('_', ' ')}
                        </span>
                        {getStatusBadge(pass.status)}
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm">{pass.destination}</h3>
                      <p className="text-xs text-slate-500 mt-1">Reason: {pass.reason}</p>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Out: <strong>{new Date(pass.out_date).toLocaleString()}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>In: <strong>{new Date(pass.in_date).toLocaleString()}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {pass.qrCodeDataUrl ? (
                        <button
                          onClick={() => setSelectedQRPass(pass)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200 cursor-pointer"
                        >
                          <QrCode className="w-4 h-4" /> View Digital QR Gate Pass
                        </button>
                      ) : pass.status === 'pending' ? (
                        <button
                          onClick={() => handleCancelPass(pass.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium py-1 cursor-pointer"
                        >
                          Cancel Application
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">{pass.rejection_reason || 'No QR available'}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Complaints */}
        {activeTab === 'complaints' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {complaints.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                      {c.category}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                      c.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                  <p className="text-xs text-slate-600">{c.description}</p>
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div>Room: <strong>{c.room_number}</strong></div>
                    {c.assigned_to && <div>Assigned Technician: <strong className="text-indigo-600">{c.assigned_to}</strong></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Mess Menu */}
        {activeTab === 'mess' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {daysOfWeek.map((day) => {
              const dayMeals = groupedMess[day] || [];
              const isToday = day === todayName;
              return (
                <div key={day} className={`rounded-xl p-4 border ${isToday ? 'bg-indigo-50/50 border-indigo-300' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                    <h3 className="font-bold text-sm text-slate-900">{day}</h3>
                    {isToday && <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">TODAY</span>}
                  </div>
                  <div className="space-y-3">
                    {['breakfast', 'lunch', 'snacks', 'dinner'].map((meal) => {
                      const item = dayMeals.find((m) => m.meal_type === meal);
                      return (
                        <div key={meal} className="text-xs">
                          <div className="font-semibold text-slate-700 capitalize">{meal} <span className="text-[10px] text-slate-400 font-normal">{item?.time_slot}</span></div>
                          <p className="text-slate-600 text-[11px] mt-0.5">{item?.menu_items || 'Standard meal'}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 4: Notices */}
        {activeTab === 'notices' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notices.map((n) => (
              <div key={n.id} className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 space-y-2">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${n.priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'}`}>
                    {n.category} • {n.priority}
                  </span>
                  <span className="text-[11px] text-slate-400">{new Date(n.created_at).toLocaleDateString()}</span>
                </div>
                <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                <p className="text-xs text-slate-600">{n.content}</p>
              </div>
            ))}
          </div>
        )}

      </main>

      {/* Modal: Apply Pass */}
      {showPassModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">Apply for Out-Pass / Leave</h3>
              <button onClick={() => setShowPassModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            {formError && <div className="p-3 bg-red-50 text-red-700 rounded-lg text-xs">{formError}</div>}
            {formSuccess && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs">{formSuccess}</div>}
            <form onSubmit={handleApplyPass} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pass Type</label>
                <select
                  value={passForm.pass_type}
                  onChange={(e) => setPassForm({ ...passForm, pass_type: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="night_out">Night Out / Late Pass</option>
                  <option value="weekend_leave">Weekend Home Leave</option>
                  <option value="day_pass">Day City Out-Pass</option>
                  <option value="emergency">Emergency Medical Leave</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. City Center, Home"
                  value={passForm.destination}
                  onChange={(e) => setPassForm({ ...passForm, destination: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={passForm.reason}
                  onChange={(e) => setPassForm({ ...passForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Out Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={passForm.out_date}
                    onChange={(e) => setPassForm({ ...passForm, out_date: e.target.value })}
                    className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={passForm.in_date}
                    onChange={(e) => setPassForm({ ...passForm, in_date: e.target.value })}
                    className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
              <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold">
                Submit for Approval
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Gate Pass */}
      {selectedQRPass && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">APPROVED GATE PASS</span>
              <button onClick={() => setSelectedQRPass(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">{user?.name}</h2>
              <p className="text-xs text-slate-500">Roll: {user?.roll_no} • Room {user?.room_number || '204'}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 inline-block shadow-inner">
              <img src={selectedQRPass.qrCodeDataUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg" />
              <p className="text-[10px] text-slate-400 mt-2 font-mono">SCAN AT CAMPUS GATE</p>
            </div>
            <div className="text-xs text-slate-600 text-left bg-slate-50 p-3 rounded-xl space-y-1">
              <div><strong>Destination:</strong> {selectedQRPass.destination}</div>
              <div><strong>Return By:</strong> {new Date(selectedQRPass.in_date).toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
