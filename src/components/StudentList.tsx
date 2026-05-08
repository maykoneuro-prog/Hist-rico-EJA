import { useState, useEffect, useMemo } from 'react';
import { studentService, gradeService, settingsService } from '../services/db';
import { Student, StudentStatus, Letterhead } from '../types';
import { 
  Search, 
  Filter, 
  Upload, 
  Download, 
  FileText, 
  MessageCircle, 
  Edit3, 
  MoreHorizontal,
  ChevronDown,
  Loader2,
  FileSpreadsheet,
  Plus,
  Eraser
} from 'lucide-react';
import { excelService, mapExcelToStudent } from '../lib/excel';
import { generateStudentPDF, generateDeclarationPDF } from '../lib/pdf';
import StudentDialog from './StudentDialog';

export default function StudentList({ students, loading }: { students: Student[], loading: boolean }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnidade, setFilterUnidade] = useState('');
  const [filterPeriodo, setFilterPeriodo] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanProgress, setCleanProgress] = useState(0);
  const [letterheads, setLetterheads] = useState<Letterhead[]>([]);
  const [targetStudentForReport, setTargetStudentForReport] = useState<Student | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const settings = await settingsService.getSettings();
      if (settings?.letterheads) {
        setLetterheads(settings.letterheads);
      }
    }
    loadSettings();
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchSearch = (s.aluno?.toLowerCase().includes(searchTerm.toLowerCase()) || '') || 
                          (s.ra?.includes(searchTerm) || '') || 
                          (s.cpf?.includes(searchTerm) || '');
      const matchUnidade = !filterUnidade || s.unidade === filterUnidade;
      const matchPeriodo = !filterPeriodo || s.periodo === filterPeriodo;
      return matchSearch && matchUnidade && matchPeriodo;
    });
  }, [students, searchTerm, filterUnidade, filterPeriodo]);

  const toggleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map(s => s.id));
    }
  };

  const toggleSelectStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const unidades = useMemo(() => Array.from(new Set(students.map(s => s.unidade))), [students]);
  const periodos = useMemo(() => Array.from(new Set(students.map(s => s.periodo))), [students]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportProgress(0);
    try {
      const data = await excelService.parseFile(file);
      const studentsToImport = data
        .map(item => mapExcelToStudent(item))
        .filter(s => s.aluno && s.ra); 

      const stats = await studentService.upsertMany(studentsToImport, (progress) => {
        setImportProgress(progress);
      });
      
      alert(`Importação concluída!\nRegistros processados: ${stats.added}\nErros: ${stats.errors}`);
    } catch (error) {
      console.error(error);
      alert('Erro ao processar arquivo Excel ou enviar para o banco.');
    } finally {
      setImporting(false);
      setImportProgress(0);
      if (e.target) e.target.value = '';
    }
  };

  const handleExportBackup = async () => {
    const allGrades: any[] = [];
    for (const s of students) {
      const grades = await gradeService.getByStudentId(s.id);
      if (grades) grades.forEach(g => allGrades.push({ studentId: s.id, aluno: s.aluno, ...g }));
    }
    excelService.exportBackup(students, allGrades);
  };

  const currentStudentSchool = targetStudentForReport?.unidade.toUpperCase() || (selectedStudents.length > 0 ? students.find(s => s.id === selectedStudents[0])?.unidade.toUpperCase() : '') || '';
  
  const filteredHistoricoLetterheads = useMemo(() => {
    return letterheads.filter(l => {
      const name = l.name.toUpperCase();
      const isType = name.includes('HISTORICO') || name.includes('HISTÓRICO');
      const isSchool = (currentStudentSchool.includes('VASCO') && name.includes('VASCO')) || 
                       (currentStudentSchool.includes('CARUARU') && name.includes('CARUARU'));
      return isType && isSchool;
    });
  }, [letterheads, currentStudentSchool]);

  const filteredDeclaracaoLetterheads = useMemo(() => {
    return letterheads.filter(l => {
      const name = l.name.toUpperCase();
      const isType = name.includes('DECLARACAO') || name.includes('DECLARAÇÃO');
      const isSchool = (currentStudentSchool.includes('VASCO') && name.includes('VASCO')) || 
                       (currentStudentSchool.includes('CARUARU') && name.includes('CARUARU'));
      return isType && isSchool;
    });
  }, [letterheads, currentStudentSchool]);

  const handleEmitReport = (student: Student) => {
    setTargetStudentForReport(student);
    setIsBulkMode(false);
    setShowReportModal(true);
  };

  const handleBulkEmitReport = () => {
    if (selectedStudents.length === 0) {
      alert('Selecione ao menos um aluno.');
      return;
    }
    setIsBulkMode(true);
    setShowReportModal(true);
  };

  const generateReport = async (type: 'historico' | 'declaracao', letterheadUrl?: string) => {
    try {
      if (isBulkMode) {
        const studentsToProcess = students.filter(s => selectedStudents.includes(s.id));
        
        if (type === 'historico') {
          const nonReady = studentsToProcess.filter(s => s.status === StudentStatus.PENDENTE);
          if (nonReady.length > 0) {
            if (!confirm(`${nonReady.length} alunos selecionados não estão como DISP. IMPRESSÃO. Deseja continuar assim mesmo?`)) return;
          }

          const bulkData = [];
          for (const s of studentsToProcess) {
            const grades = await gradeService.getByStudentId(s.id);
            if (grades) bulkData.push({ student: s, grades });
          }

          if (bulkData.length > 0) {
            const pdfGenerated = await generateStudentPDF(bulkData, [], letterheadUrl, true);
            if (pdfGenerated && confirm('Documento gerado! Deseja alterar o status de todos os alunos selecionados para "CERT. GERADO"?')) {
              for (const s of studentsToProcess) {
                await studentService.update(s.id, { status: StudentStatus.CERT_GERADO });
              }
            }
          }
        } else {
          await generateDeclarationPDF(studentsToProcess, letterheadUrl, true);
        }
      } else if (targetStudentForReport) {
        if (type === 'historico') {
          const grades = await gradeService.getByStudentId(targetStudentForReport.id);
          if (grades) {
            await generateStudentPDF(targetStudentForReport, grades, letterheadUrl);
            
            if (confirm('Documento gerado! Deseja alterar o status deste aluno para "CERT. GERADO"?')) {
              await studentService.update(targetStudentForReport.id, { status: StudentStatus.CERT_GERADO });
            }
          }
        } else {
          await generateDeclarationPDF(targetStudentForReport, letterheadUrl);
        }
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar documento. Verifique o timbrado.');
    } finally {
      setShowReportModal(false);
      setSelectedStudents([]);
    }
  };

  const handleCleanDuplicates = async () => {
    if (!confirm('Esta ação irá identificar registros com o mesmo RA e Unidade e remover duplicatas antigas. Deseja continuar?')) return;
    
    setIsCleaning(true);
    setCleanProgress(0);
    try {
      const deletedCount = await studentService.cleanDuplicates((progress) => {
        setCleanProgress(progress);
      });
      if (deletedCount === 0) {
        alert('Nenhuma duplicata foi encontrada. Sua base já está saneada!');
      } else {
        alert(`Saneamento concluído! ${deletedCount} registros duplicados foram removidos.`);
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao realizar saneamento da base.');
    } finally {
      setIsCleaning(false);
      setCleanProgress(0);
    }
  };

  if ((loading || isCleaning) && students.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <Loader2 className="animate-spin text-blue-600" size={40} />
      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
        {isCleaning ? `Saneando Base (${cleanProgress}%)...` : 'Sincronizando Base...'}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 border-l-4 border-blue-600 pl-3">Controle de Alunos</h2>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleCleanDuplicates}
            disabled={isCleaning}
            className="flex items-center gap-2 px-3 py-1.5 border border-amber-200 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-all font-bold text-[10px] uppercase shadow-sm disabled:opacity-50"
            title="Saneamento de Base (Remove Duplicatas)"
          >
            {isCleaning ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
            {isCleaning ? 'Saneando...' : 'Saneamento de Base'}
          </button>

          <button
            onClick={() => excelService.downloadTemplate()}
            className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-semibold text-xs shadow-sm"
          >
            <Download size={14} /> Modelo
          </button>
          
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-bold text-xs shadow-lg shadow-blue-500/20 cursor-pointer">
            <Plus size={16} /> {importing ? 'Importando...' : 'Importar XLSX'}
            <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" disabled={importing} />
          </label>

          <button
            onClick={handleExportBackup}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all font-semibold text-xs border border-gray-200"
          >
            <FileSpreadsheet size={14} /> Backup Global
          </button>

          {selectedStudents.length > 0 && (
            <button
              onClick={handleBulkEmitReport}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-bold text-xs shadow-lg shadow-emerald-500/20 animate-in zoom-in"
            >
              <FileText size={16} /> Emitir Lote ({selectedStudents.length})
            </button>
          )}
        </div>
      </div>

      {importing && (
        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} />
              Sincronizando com o banco...
            </span>
            <span className="text-xs font-black text-blue-600">{importProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-300 ease-out" 
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {isCleaning && (
        <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} />
              Saneando base de dados...
            </span>
            <span className="text-xs font-black text-amber-600">{cleanProgress}%</span>
          </div>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-amber-600 h-full transition-all duration-300 ease-out" 
              style={{ width: `${cleanProgress}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex flex-col md:flex-row gap-3 items-center bg-gray-50/30">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar registros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={filterUnidade}
              onChange={(e) => setFilterUnidade(e.target.value)}
              className="min-w-[140px] bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Unidades</option>
              {unidades.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            
            <select
              value={filterPeriodo}
              onChange={(e) => setFilterPeriodo(e.target.value)}
              className="min-w-[100px] bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
            >
              <option value="">Anos</option>
              {periodos.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-gray-50/80 text-gray-400 font-semibold uppercase tracking-tight">
                <th className="px-3 py-3 border-b border-gray-100">
                  <input 
                    type="checkbox" 
                    checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Unidade</th>
                <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Período</th>
                <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">RA</th>
                <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Turma</th>
                <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Aluno</th>
                <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Telefone</th>
                <th className="px-3 py-3 border-b border-gray-100 whitespace-nowrap">Status</th>
                <th className="px-3 py-3 border-b border-gray-100 text-right sticky right-0 bg-gray-50/80">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-gray-400 font-medium">
                    Sem registros para exibir
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s) => (
                  <tr key={s.id} className={`${selectedStudents.includes(s.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'} transition-colors group`}>
                    <td className="px-3 py-3">
                      <input 
                        type="checkbox" 
                        checked={selectedStudents.includes(s.id)}
                        onChange={() => toggleSelectStudent(s.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-3 font-medium truncate max-w-[120px]" title={s.unidade}>{s.unidade}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{s.periodo}</td>
                    <td className="px-3 py-3 tabular-nums">{s.ra}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{s.turma}</td>
                    <td className="px-3 py-3 font-bold text-gray-900 group-hover:text-blue-600 transition-colors uppercase whitespace-nowrap">{s.aluno}</td>
                    <td className="px-3 py-3 whitespace-nowrap tabular-nums">{s.telefone2 || '-'}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${
                        s.status === StudentStatus.CERT_GERADO 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : s.status === StudentStatus.DISP_IMPRESSAO
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {s.status === StudentStatus.DISP_IMPRESSAO ? 'DISP. IMPRESSÃO' : s.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right sticky right-0 bg-white group-hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-end gap-1">
                        {s.telefone2 && (
                          <a
                            href={`https://wa.me/${s.telefone2.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded transition-all"
                            title="WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => setSelectedStudent(s)}
                          className="p-1.5 text-blue-600 hover:bg-blue-600 hover:text-white rounded transition-all"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleEmitReport(s)}
                          className="p-1.5 text-gray-400 hover:text-emerald-500 transition-all rounded"
                          title="Emitir Documento"
                        >
                          <Download size={14} />
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

      {selectedStudent && (
        <StudentDialog 
          student={selectedStudent} 
          onClose={() => setSelectedStudent(null)} 
        />
      )}

      {showReportModal && targetStudentForReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100">
            <div className="bg-gray-900 p-6 text-white flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">Emissão de Documentos</h3>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-bold">{targetStudentForReport.aluno}</p>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-white transition-colors">
                <ChevronDown className="rotate-180" size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Seção de Histórico */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <FileText className="text-emerald-600" size={18} />
                  <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Opção 1: Histórico Escolar</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => generateReport('historico')}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-100 transition-all flex flex-col items-center gap-1"
                  >
                    <span className="opacity-50">Sem Timbrado</span>
                  </button>
                  {filteredHistoricoLetterheads.map(l => (
                    <button 
                      key={`h-${l.id}`}
                      onClick={() => generateReport('historico', l.url)}
                      className="p-3 bg-white border border-emerald-100 rounded-xl text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 transition-all shadow-sm flex flex-col items-center gap-1 text-center"
                    >
                      <span>{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seção de Declaração */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <FileSpreadsheet className="text-blue-600" size={18} />
                  <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Opção 2: Declaração de Vínculo</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <button 
                    onClick={() => generateReport('declaracao')}
                    className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 hover:bg-gray-100 transition-all flex flex-col items-center gap-1"
                  >
                    <span className="opacity-50">Sem Timbrado</span>
                  </button>
                  {filteredDeclaracaoLetterheads.map(l => (
                    <button 
                      key={`d-${l.id}`}
                      onClick={() => generateReport('declaracao', l.url)}
                      className="p-3 bg-white border border-blue-100 rounded-xl text-[10px] font-bold text-blue-700 hover:bg-blue-50 transition-all shadow-sm flex flex-col items-center gap-1 text-center"
                    >
                      <span>{l.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100">
              <button 
                onClick={() => setShowReportModal(false)}
                className="w-full py-2 text-xs font-black uppercase text-gray-500 hover:text-gray-900 transition-colors tracking-widest"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
