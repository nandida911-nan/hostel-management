import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import Navbar from '../components/common/Navbar';
import { 
  Building2, 
  CheckCircle2, 
  XCircle, 
  Users, 
  BedDouble, 
  Wrench, 
  Bell, 
  Plus, 
  Search, 
  Filter,
  Check,
  X
} from 'lucide-react';

export default function WardenDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('approvals');
  const [passes, setPasses] = useState([]);
  const [stats, setStats] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [students, setStudents] = useState([]);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Allocate Room Modal
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Notice Form
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', category: 'general', priority: 'normal' });
  const [showNoticeModal, setShowNoticeModal] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [passesRes, statsRes, roomsRes, complaintsRes, usersRes, noticesRes] = await Promise.all([
        api.getAllPasses(),
        api.getOccupancyStats(),
        api.getRooms(),
        api.getComplaints(),
        api.getUsers({ role: 'student' }),
        api.getNotices()
      ]);
      setPasses(passesRes.outpasses || []);
      setStats(statsRes || null);
      setRooms(roomsRes.rooms || []);
      setComplaints(complaintsRes.complaints || []);
      setStudents(usersRes.users || []);
      setNotices(noticesRes.notices || []);
    } catch (err) {
      console.error('Error loading warden data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePassAction = async (id, status, reason = '') => {
    try {
      await api.updatePassStatus(id, { status, rejection_reason: reason });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAllocateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.allocateRoom({
        user_id: selectedStudentId,
        room_id: selectedRoom.id,
        bed_number: 1
      });
      setShowAllocateModal(false);
      setSelectedStudentId('');
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeallocate = async (userId) => {
    if (window.confirm('Remove student room allocation?')) {
      try {
        await api.deallocateRoom({ user_id: userId });
        loadData();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleUpdateComplaint = async (id, status, assignedTo) => {
    try {
      await api.updateComplaint(id, { status, assigned_to: assignedTo });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    try {
      await api.createNotice(noticeForm);
      setShowNoticeModal(false);
      setNoticeForm({ title: '', content: '', category: 'general', priority: 'normal' });
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const pendingPasses = passes.filter((p) => p.status === 'pending');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Occupancy</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.occupancyRate || 0}%</div>
            <div className="text-xs text-slate-400 mt-1">{stats?.occupied_beds || 0} / {stats?.total_beds || 0} Beds Occupied</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Out-Passes</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{pendingPasses.length}</div>
            <div className="text-xs text-slate-400 mt-1">Awaiting your approval</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Complaints</div>
            <div className="text-2xl font-black text-indigo-600 mt-1">
              {complaints.filter((c) => c.status !== 'resolved').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Open / In-Progress Tickets</div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{stats?.totalStudents || 0}</div>
            <div className="text-xs text-slate-400 mt-1">{stats?.unallocatedStudents || 0} Unallocated</div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'approvals' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <CheckCircle2 className="w-4 h-4" /> Out-Pass Approvals ({pendingPasses.length})
          </button>
          <button
            onClick={() => setActiveTab('rooms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'rooms' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <BedDouble className="w-4 h-4" /> Room Allocation Matrix ({rooms.length})
          </button>
          <button
            onClick={() => setActiveTab('complaints')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'complaints' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Wrench className="w-4 h-4" /> Maintenance Tickets ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab('notices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${activeTab === 'notices' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <Bell className="w-4 h-4" /> Broadcast Notices ({notices.length})
          </button>
        </div>

        {/* TAB 1: PASS APPROVALS */}
        {activeTab === 'approvals' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-sm font-bold text-slate-800">Student Out-Pass Requests</h2>
                <span className="text-xs text-slate-500">{passes.length} Total Passes in System</span>
              </div>

              <div className="divide-y divide-slate-100">
                {passes.map((pass) => (
                  <div key={pass.id} className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{pass.student_name}</span>
                        <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-mono">{pass.student_roll_no}</span>
                        <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded uppercase font-semibold">{pass.pass_type}</span>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          pass.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          pass.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          pass.status === 'checked_out' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {pass.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600">
                        <strong>Destination:</strong> {pass.destination} • <strong>Reason:</strong> {pass.reason}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-3">
                        <span>Out: {new Date(pass.out_date).toLocaleString()}</span>
                        <span>In: {new Date(pass.in_date).toLocaleString()}</span>
                        <span>Parent Phone: <strong className="text-slate-600">{pass.parent_phone || 'N/A'}</strong></span>
                      </div>
                    </div>

                    {/* Action Buttons for Pending Passes */}
                    {pass.status === 'pending' && (
                      <div className="flex items-center gap-2 w-full md:w-auto">
                        <button
                          onClick={() => handlePassAction(pass.id, 'approved')}
                          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Approve & Issue QR
                        </button>
                        <button
                          onClick={() => {
                            const reason = prompt('Enter reason for rejection:');
                            if (reason !== null) handlePassAction(pass.id, 'rejected', reason);
                          }}
                          className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-semibold transition border border-red-200 cursor-pointer"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ROOM ALLOCATION MATRIX */}
        {activeTab === 'rooms' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div key={room.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{room.block_name} - Room {room.room_number}</h3>
                      <p className="text-xs text-slate-500">Floor {room.floor} • {room.room_type}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      room.occupied_beds >= room.capacity ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {room.occupied_beds} / {room.capacity} Beds
                    </span>
                  </div>

                  {/* Residents list */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                    <div className="font-semibold text-slate-700 text-[11px] uppercase">Residents:</div>
                    {room.occupants && room.occupants.length > 0 ? (
                      room.occupants.map((occ) => (
                        <div key={occ.id} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg">
                          <div>
                            <div className="font-medium text-slate-800">{occ.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{occ.roll_no} • {occ.phone}</div>
                          </div>
                          <button
                            onClick={() => handleDeallocate(occ.id)}
                            className="text-[10px] text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic">No students allocated yet</div>
                    )}
                  </div>

                  {room.occupied_beds < room.capacity && (
                    <button
                      onClick={() => {
                        setSelectedRoom(room);
                        setShowAllocateModal(true);
                      }}
                      className="w-full mt-2 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition border border-indigo-200 cursor-pointer"
                    >
                      + Allocate Student
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: COMPLAINTS DESK */}
        {activeTab === 'complaints' && (
          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 shadow-xs">
            {complaints.map((c) => (
              <div key={c.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{c.category}</span>
                    <h3 className="font-bold text-slate-900 text-sm">{c.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      c.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' :
                      c.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {c.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{c.description}</p>
                  <div className="text-[11px] text-slate-400">
                    Reported by: <strong>{c.student_name}</strong> (Room {c.room_number}) • Assigned: <strong className="text-indigo-600">{c.assigned_to || 'Unassigned'}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={c.status}
                    onChange={(e) => handleUpdateComplaint(c.id, e.target.value, c.assigned_to)}
                    className="text-xs border border-slate-300 rounded-lg px-2 py-1 bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>

                  <button
                    onClick={() => {
                      const tech = prompt('Assign Technician Name:', c.assigned_to || 'Tech. Suresh (Electrician)');
                      if (tech !== null) handleUpdateComplaint(c.id, 'in_progress', tech);
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    Assign Tech
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: BROADCAST NOTICES */}
        {activeTab === 'notices' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold text-slate-800">Campus Notice Board</h2>
              <button
                onClick={() => setShowNoticeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Post Announcement
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((n) => (
                <div key={n.id} className="bg-white rounded-2xl p-5 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{n.category}</span>
                    <button
                      onClick={async () => {
                        if (window.confirm('Delete notice?')) {
                          await api.deleteNotice(n.id);
                          loadData();
                        }
                      }}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{n.title}</h3>
                  <p className="text-xs text-slate-600">{n.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Modal: Allocate Student */}
      {showAllocateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Allocate Student to Room {selectedRoom?.room_number}</h3>
            <form onSubmit={handleAllocateStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student</label>
                <select
                  required
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">-- Choose Student --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.roll_no}) {s.room_id ? `[Current: Room ${s.room_number}]` : '[Unallocated]'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create Notice */}
      {showNoticeModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Post Campus Notice</h3>
            <form onSubmit={handleCreateNotice} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notice Title</label>
                <input
                  type="text"
                  required
                  value={noticeForm.title}
                  onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Content</label>
                <textarea
                  required
                  rows={3}
                  value={noticeForm.content}
                  onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={noticeForm.category}
                    onChange={(e) => setNoticeForm({ ...noticeForm, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="general">General</option>
                    <option value="curfew">Curfew</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="mess">Mess</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={noticeForm.priority}
                    onChange={(e) => setNoticeForm({ ...noticeForm, priority: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoticeModal(false)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                >
                  Broadcast Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
