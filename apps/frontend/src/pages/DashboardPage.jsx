import React, { useState, useEffect } from 'react';
import { IconFileDescription, IconUsers, IconSend, IconClock } from '@tabler/icons-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import PageHeader from '../components/common/PageHeader';
import api from '../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-xl ${colorClass}`}>
      <Icon className="w-6 h-6" />
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  </div>
);

const DashboardPage = () => {
  const [stats, setStats] = useState({ totalTemplates: 0, totalStudents: 0, totalGenerations: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data.data.stats);
        setRecentActivities(response.data.data.recentActivities);
      } catch (error) {
        toast.error('Gagal memuat data dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Dashboard" 
        description="Ringkasan aktivitas dan statistik penggunaan aplikasi SchoolMailer."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Template" 
          value={isLoading ? '...' : stats.totalTemplates} 
          icon={IconFileDescription} 
          colorClass="bg-blue-50 text-blue-600"
        />
        <StatCard 
          title="Total Siswa" 
          value={isLoading ? '...' : stats.totalStudents} 
          icon={IconUsers} 
          colorClass="bg-indigo-50 text-indigo-600"
        />
        <StatCard 
          title="Dokumen Dibuat" 
          value={isLoading ? '...' : stats.totalGenerations} 
          icon={IconSend} 
          colorClass="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Aktivitas Generate Terbaru</h2>
            <p className="text-sm text-slate-500 mt-1">5 riwayat pembuatan dokumen terakhir</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-lg">
            <IconClock className="w-5 h-5 text-slate-400" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Memuat data...</div>
        ) : recentActivities.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Belum ada aktivitas generate dokumen.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Template</th>
                  <th className="px-6 py-4">Jumlah Siswa</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentActivities.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'dd MMM yyyy HH:mm', { locale: localeID })}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-800">
                      {log.template?.title || 'Terhapus'}
                    </td>
                    <td className="px-6 py-4">
                      {log.studentCount} Siswa
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        log.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        log.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {log.status}
                      </span>
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
};

export default DashboardPage;
