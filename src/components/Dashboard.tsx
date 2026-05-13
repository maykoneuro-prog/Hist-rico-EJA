import { useState, useEffect, useMemo } from 'react';
import { studentService } from '../services/db';
import { Student, StudentStatus } from '../types';
import { Users, Clock, CheckCircle, TrendingUp, BarChart3, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

export default function Dashboard({ students, loading }: { students: Student[], loading: boolean }) {
  const [filterUnidade, setFilterUnidade] = useState('TODAS');
  const [filterPeriodo, setFilterPeriodo] = useState('TODOS');

  const { filteredStudents, stats, chartData, unitData } = useMemo(() => {
    const filtered = students.filter(s => {
      const matchUnidade = filterUnidade === 'TODAS' || s.unidade === filterUnidade;
      const matchPeriodo = filterPeriodo === 'TODOS' || s.periodo === filterPeriodo;
      return matchUnidade && matchPeriodo;
    });

    const statsObj = {
      total: filtered.length,
      pending: filtered.filter(s => s.status === StudentStatus.PENDENTE).length,
      ready: filtered.filter(s => s.status === StudentStatus.DISP_IMPRESSAO).length,
      generated: filtered.filter(s => s.status === StudentStatus.CERT_GERADO).length,
      docs: filtered.filter(s => s.documentacaoEntregue).length,
      sent: filtered.filter(s => s.certificadoEnviado).length,
    };

    const cData = [
      { name: 'Pendentes', value: statsObj.pending, color: '#f59e0b' },
      { name: 'Disp. Impressão', value: statsObj.ready, color: '#3b82f6' },
      { name: 'Cert. Gerado', value: statsObj.generated, color: '#10b981' },
    ];

    // Contagem por unidade (top 10)
    const unitCounts: Record<string, number> = {};
    filtered.forEach(s => {
      unitCounts[s.unidade] = (unitCounts[s.unidade] || 0) + 1;
    });
    
    const uData = Object.entries(unitCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { filteredStudents: filtered, stats: statsObj, chartData: cData, unitData: uData };
  }, [students, filterUnidade, filterPeriodo]);

  const uniqueUnidades = useMemo(() => 
    Array.from(new Set(students.map(s => s.unidade))).sort()
  , [students]);

  const uniquePeriodos = useMemo(() => 
    Array.from(new Set(students.map(s => s.periodo))).sort()
  , [students]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="text-xs font-bold text-gray-500 uppercase">Processando base...</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-end bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Filter size={10} /> Unidade Escolar
          </label>
          <select 
            value={filterUnidade} 
            onChange={(e) => setFilterUnidade(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-100"
          >
            <option value="TODAS">TODAS AS UNIDADES</option>
            {uniqueUnidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-1.5">
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
            <Filter size={10} /> Período
          </label>
          <select 
            value={filterPeriodo} 
            onChange={(e) => setFilterPeriodo(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-100"
          >
            <option value="TODOS">TODOS OS PERÍODOS</option>
            {uniquePeriodos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex-none bg-blue-50 px-6 py-2.5 rounded-lg border border-blue-100 h-10 flex items-center">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
            {stats.total} ALUNOS FILTRADOS
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-gray-200">
        <div className="flex gap-6 overflow-x-auto pb-2">
          <StatCard title="Total" value={stats.total} />
          <div className="w-px bg-gray-200 h-10 shrink-0" />
          <StatCard title="Pendentes" value={stats.pending} color="text-amber-500" />
          <div className="w-px bg-gray-200 h-10 shrink-0" />
          <StatCard title="Disp. Impressão" value={stats.ready} color="text-blue-500" />
          <div className="w-px bg-gray-200 h-10 shrink-0" />
          <StatCard title="Cert. Gerado" value={stats.generated} color="text-emerald-500" />
          <div className="w-px bg-gray-200 h-10 shrink-0" />
          <StatCard title="Doc. Entregue" value={stats.docs} color="text-emerald-700" />
          <div className="w-px bg-gray-200 h-10 shrink-0" />
          <StatCard title="Enviados" value={stats.sent} color="text-blue-700" />
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <BarChart3 className="text-gray-400" size={20} />
          <span className="text-sm font-semibold text-gray-900">Performance</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp size={18} className="text-blue-600" />
            <h3 className="font-semibold text-gray-900">Status de Processamento</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#6B7280', fontWeight: 'bold' }} />
                <YAxis hide />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Users size={18} className="text-purple-600" />
              <h3 className="font-semibold text-gray-900">Volume por Unidade</h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded">Top 10</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unitData} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#6B7280', fontWeight: 'bold' }} />
                <Tooltip labelStyle={{ fontSize: 11, fontWeight: 'bold' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, color = "text-gray-900" }: { title: string, value: number, color?: string }) {
  return (
    <div className="flex flex-col min-w-[100px]">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5 whitespace-nowrap">{title}</span>
      <span className={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</span>
    </div>
  );
}
