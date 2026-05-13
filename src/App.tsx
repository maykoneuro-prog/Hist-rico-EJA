import { useState, useEffect, useMemo } from 'react';
import { useAuth } from './hooks/useAuth';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { LogOut, Users, LayoutDashboard, Database, GraduationCap, Clock, ShieldAlert } from 'lucide-react';
import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { studentService } from './services/db';
import { Student } from './types';

type Page = 'dashboard' | 'students' | 'users';

export default function App() {
  const { user, appUser, loading: authLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!user || !appUser?.isApproved) return;
    
    // Unica subscrição para todo o app
    const unsubscribe = studentService.subscribe((data) => {
      setStudents(data);
      setDataLoading(false);
    });
    return unsubscribe;
  }, [user, appUser?.isApproved]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Pending Approval Screen
  if (appUser && !appUser.isApproved) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="text-amber-600 animate-pulse" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Pendente</h2>
          <p className="text-gray-500 text-sm mb-8">
            Seu cadastro foi recebido com sucesso. Por motivos de segurança, sua conta precisa ser aprovada pelo administrador antes de acessar os dados do sistema.
          </p>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 mb-8 text-xs font-medium text-amber-700 text-left flex gap-3">
            <ShieldAlert className="shrink-0" size={16} />
            <span>Notificamos o responsável. Você receberá acesso assim que a solicitação for processada.</span>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm tracking-wide hover:bg-gray-800 transition-all active:scale-95"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  // Inactive Account Screen
  if (appUser && appUser.isActive === false) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="text-red-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acesso Inativado</h2>
          <p className="text-gray-500 text-sm mb-8">
            Seu acesso ao sistema foi temporariamente desativado por um administrador.
          </p>
          <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-8 text-xs font-medium text-red-700 text-left flex gap-3">
            <Clock className="shrink-0" size={16} />
            <span>Caso acredite ser um erro, entre em contato com a administração.</span>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-sm tracking-wide hover:bg-gray-800 transition-all active:scale-95"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] bg-[#111827] text-white flex flex-col shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-xl">🎓</span>
            <h1 className="text-lg font-bold tracking-tight">Histórico EJA</h1>
          </div>
          
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                currentPage === 'dashboard' ? 'bg-[#1F2937] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <LayoutDashboard size={18} />
              <span>Painel de Alunos</span>
            </button>
            
            <button
              onClick={() => setCurrentPage('students')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                currentPage === 'students' ? 'bg-[#1F2937] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <Database size={18} />
              <span>Lista de Alunos</span>
            </button>

            {appUser?.isAdmin && (
              <button
                onClick={() => setCurrentPage('users')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  currentPage === 'users' ? 'bg-[#1F2937] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Users size={18} />
                <span>Configurações</span>
              </button>
            )}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold ${appUser?.isAdmin ? 'bg-blue-600' : 'bg-gray-700'}`}>
              {appUser?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-white/90">
                <p className="text-xs font-semibold truncate">{appUser?.name}</p>
                {appUser?.isAdmin && <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded uppercase font-bold">Admin</span>}
              </div>
              <p className="text-[10px] text-gray-500 truncate">{appUser?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-xs font-medium transition-colors"
          >
            <LogOut size={14} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto h-full">
            {currentPage === 'dashboard' && (
              <Dashboard students={students} loading={dataLoading} />
            )}
            {currentPage === 'students' && (
              <StudentList students={students} loading={dataLoading} />
            )}
            {currentPage === 'users' && appUser?.isAdmin && <UserManagement />}
          </div>
        </div>
      </main>
    </div>
  );
}
