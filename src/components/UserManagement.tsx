import { useState, useEffect } from 'react';
import { userService, settingsService, studentService } from '../services/db';
import { AppUser, Letterhead } from '../types';
import { UserPlus, Shield, CheckCircle2, Trash2, UserCheck, FileImage, Upload, Eye, ShieldAlert, UserX } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [newLetterheadName, setNewLetterheadName] = useState('');
  const [newLetterheadUrl, setNewLetterheadUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function load() {
      const [usersData, settings] = await Promise.all([
        userService.getAll(),
        settingsService.getSettings()
      ]);
      setUsers(usersData || []);
      if (settings?.letterheads) {
        setLetterheads(settings.letterheads);
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleAddLetterhead = async () => {
    if (!newLetterheadName || !newLetterheadUrl) {
      alert('Preencha o nome e o link da imagem.');
      return;
    }

    const newLetterhead: Letterhead = {
      id: Date.now().toString(),
      name: newLetterheadName,
      url: newLetterheadUrl
    };

    const updated = [...letterheads, newLetterhead];
    setUploading(true);
    try {
      await settingsService.updateSettings({ letterheads: updated });
      setLetterheads(updated);
      setNewLetterheadName('');
      setNewLetterheadUrl('');
      alert('Timbrado adicionado!');
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLetterhead = async (id: string) => {
    if (!confirm('Deseja remover este timbrado?')) return;
    const updated = letterheads.filter(l => l.id !== id);
    setUploading(true);
    try {
      await settingsService.updateSettings({ letterheads: updated });
      setLetterheads(updated);
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);

  const handleApprove = async (uid: string) => {
    if (!confirm('Deseja aprovar este usuário?')) return;
    await userService.approve(uid);
    setUsers(users.map(u => u.uid === uid ? { ...u, isApproved: true, isActive: true } : u));
  };

  const handleElevate = async (uid: string) => {
    if (!confirm('Deseja tornar este usuário um administrador?')) return;
    await userService.elevateToAdmin(uid);
    setUsers(users.map(u => u.uid === uid ? { ...u, isAdmin: true, isApproved: true, role: 'ADMIN' } : u));
  };

  const handleToggleStatus = async (user: AppUser) => {
    const isCurrentlyActive = user.isActive !== false;
    const action = isCurrentlyActive ? 'inativar' : 'ativar';
    if (!confirm(`Deseja ${action} este usuário?`)) return;
    
    await userService.toggleStatus(user.uid, isCurrentlyActive);
    setUsers(users.map(u => u.uid === user.uid ? { ...u, isActive: !isCurrentlyActive } : u));
  };

  const handleDelete = async (uid: string) => {
    if (!confirm('Deseja excluir este acesso?')) return;
    await userService.delete(uid);
    setUsers(users.filter(u => u.uid !== uid));
  };

  const handleZerarBanco = async () => {
    if (confirm('ATENÇÃO: Deseja apagar TODOS os registros de alunos? Esta ação é irreversível e deve ser usada apenas para iniciar o uso em produção.')) {
      try {
        setIsDeleting(true);
        setDeleteProgress(0);
        const count = await studentService.deleteAll((progress) => {
          setDeleteProgress(progress);
        });
        alert(`${count} registros (incluindo notas e auditoria) foram apagados com sucesso.`);
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert('Erro ao limpar banco de dados.');
      } finally {
        setIsDeleting(false);
        setDeleteProgress(0);
      }
    }
  };

  return (
    <div className="space-y-6">
      {isDeleting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-6 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center space-y-6 border border-gray-100">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Trash2 className="text-red-600" size={32} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Limpando Base de Dados</h3>
              <p className="text-sm text-gray-500 mt-2">Isso pode levar alguns segundos dependendo do volume de dados.</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-red-600">
                <span>Progresso da Exclusão</span>
                <span>{deleteProgress}%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-red-600 h-full transition-all duration-300" 
                  style={{ width: `${deleteProgress}%` }}
                />
              </div>
            </div>

            <p className="text-[10px] text-gray-400 font-medium">Por favor, não feche esta janela até concluir.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 border-l-4 border-emerald-500 pl-3">Controle de Acessos</h2>
          <p className="text-xs text-gray-400 mt-1 pl-4 uppercase tracking-wider font-bold">Gerencie permissões e aprove novos membros</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[13px]">
                <thead>
                  <tr className="bg-gray-50/80 text-gray-400 font-semibold uppercase tracking-tight">
                    <th className="px-4 py-3 border-b border-gray-100">Colaborador</th>
                    <th className="px-4 py-3 border-b border-gray-100">Status</th>
                    <th className="px-4 py-3 border-b border-gray-100">Perfil</th>
                    <th className="px-4 py-3 border-b border-gray-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 font-medium">Carregando dados da equipe...</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 font-medium">Sem colaboradores registrados</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`h-8 w-8 rounded flex items-center justify-center font-bold border text-xs ${user.isAdmin ? 'bg-blue-100 text-blue-600 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                              {user.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{user.name}</p>
                              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {!user.isApproved ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-amber-100">
                              Aguarda Aprovação
                            </span>
                          ) : user.isActive === false ? (
                            <span className="inline-flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-red-100">
                              <UserX size={10} /> Inativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                              <CheckCircle2 size={10} /> Ativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${user.isAdmin ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-gray-600 bg-gray-100 border-gray-200'}`}>
                            {user.isAdmin ? 'Administrador' : 'Operador'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {!user.isApproved && (
                              <button 
                                onClick={() => handleApprove(user.uid)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors title='Aprovar Acesso'"
                              >
                                <UserCheck size={16} />
                              </button>
                            )}
                            {user.isApproved && !user.isAdmin && (
                              <button 
                                onClick={() => handleElevate(user.uid)}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Tornar Admin"
                              >
                                <Shield size={16} />
                              </button>
                            )}
                            {user.isApproved && (
                              <button 
                                onClick={() => handleToggleStatus(user)}
                                className={`p-1.5 rounded-lg transition-colors ${user.isActive === false ? 'text-emerald-600 hover:bg-emerald-100' : 'text-amber-600 hover:bg-amber-100'}`}
                                title={user.isActive === false ? "Ativar Usuário" : "Inativar Usuário"}
                              >
                                {user.isActive === false ? <UserCheck size={16} /> : <UserX size={16} />}
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(user.uid)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Excluir Acesso"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileImage className="text-blue-600" size={18} />
              <h3 className="font-bold text-gray-900 text-sm">Gerenciar Timbrados</h3>
            </div>
            <p className="text-[11px] text-gray-500 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
              Gerencie seus papéis timbrados (Sesi Vasco, Sesi Caruaru, Comum). 
              Insira o nome de identificação e o link público da imagem.
            </p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <input 
                  type="text"
                  placeholder="Nome do Timbrado (Ex: Sesi Caruaru)"
                  value={newLetterheadName}
                  onChange={(e) => setNewLetterheadName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <input 
                  type="text"
                  placeholder="Link Público da Imagem"
                  value={newLetterheadUrl}
                  onChange={(e) => setNewLetterheadUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={handleAddLetterhead}
                disabled={uploading}
                className={`w-full py-2.5 rounded-xl text-white font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                  uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
                }`}
              >
                {uploading ? 'Salvando...' : 'Adicionar Timbrado'}
              </button>

              <div className="border-t border-gray-100 pt-4 space-y-2">
                {letterheads.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="h-8 w-8 rounded bg-white shadow-sm flex-shrink-0 flex items-center justify-center border border-gray-200">
                        <img src={l.url} alt="" className="max-h-full max-w-full" referrerPolicy="no-referrer" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-700 truncate">{l.name}</span>
                    </div>
                    <button 
                      onClick={() => handleRemoveLetterhead(l.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-6 rounded-xl flex items-center gap-6 border border-gray-800">
            <div className="bg-gray-800 p-2.5 rounded-lg border border-gray-700">
              <Shield className="text-blue-400" size={20} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm">Política de Acesso</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Somente administradores master podem gerenciar timbrados e aprovar novos membros.</p>
            </div>
          </div>

          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
            <div className="flex items-center gap-2 mb-3 text-red-600">
              <ShieldAlert size={20} />
              <h4 className="font-bold text-sm">Zona de Perigo</h4>
            </div>
            <p className="text-[11px] text-red-500 mb-4 font-medium">
              Esta ação irá apagar permanentemente TODOS os registros de alunos e históricos do banco de dados. Use apenas para preparar o ambiente de produção.
            </p>
            <button
              onClick={handleZerarBanco}
              disabled={isDeleting || loading}
              className="w-full py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isDeleting ? 'Processando...' : 'Zerar Banco de Dados (Produção)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
