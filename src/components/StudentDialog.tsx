import { useState, useEffect, useMemo } from 'react';
import { studentService, gradeService } from '../services/db';
import { Student, Grade, StudentStatus } from '../types';
import { EJA_CURRICULAR_STRUCTURE } from '../constants';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react';

interface StudentDialogProps {
  student: Student;
  onClose: () => void;
}

export default function StudentDialog({ student, onClose }: StudentDialogProps) {
  const [formData, setFormData] = useState<Student>(student);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await gradeService.getByStudentId(student.id);
      
      // Initialize with fixed curriculum
      const initialGrades: Grade[] = [];
      EJA_CURRICULAR_STRUCTURE.forEach(area => {
        area.competencies.forEach(comp => {
          // Check if student already has a score for this
          const existing = data?.find(g => g.area === area.area && g.discipline === comp.name);
          initialGrades.push({
            id: existing?.id,
            area: area.area,
            discipline: comp.name,
            hours: comp.hours,
            score: existing?.score || '',
            situation: existing?.situation || ''
          });
        });
      });

      setGrades(initialGrades);
      setLoadingGrades(false);
    }
    load();
  }, [student.id]);

  const handleUpdateStudent = (field: keyof Student, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // If certificadoEnviado is true and was false, set date
      if (field === 'certificadoEnviado' && value === true && !prev.certificadoEnviado) {
        newData.dataEnvioCertificado = new Date().toISOString();
      } else if (field === 'certificadoEnviado' && value === false) {
        newData.dataEnvioCertificado = null;
      }
      
      return newData;
    });
  };

  const calculateSituation = (score: string) => {
    const num = parseFloat(score.replace(',', '.'));
    if (isNaN(num)) return '';
    return num >= 60 ? 'Aprovado' : 'Reprovado';
  };

  const handleGradeChange = (index: number, value: string) => {
    const newGrades = [...grades];
    const cleanedValue = value.replace(/[^0-9,.]/g, '').replace('.', ',');
    
    // Auto-calculate situation only if it was empty or previously calculated (Aprovado/Reprovado)
    const currentSit = newGrades[index].situation;
    const shouldAutoUpdate = !currentSit || currentSit === 'Aprovado' || currentSit === 'Reprovado';
    
    newGrades[index] = { 
      ...newGrades[index], 
      score: cleanedValue,
      situation: shouldAutoUpdate ? calculateSituation(cleanedValue) : currentSit
    };
    setGrades(newGrades);
  };

  const handleSituationChange = (index: number, value: string) => {
    const newGrades = [...grades];
    newGrades[index] = { ...newGrades[index], situation: value };
    setGrades(newGrades);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await studentService.update(student.id, {
        pai: formData.pai,
        mae: formData.mae,
        aluno: formData.aluno,
        telefone2: formData.telefone2,
        email: formData.email,
        ra: formData.ra,
        unidade: formData.unidade,
        periodo: formData.periodo,
        turma: formData.turma,
        turno: formData.turno,
        dataNascimento: formData.dataNascimento,
        cpf: formData.cpf,
        rg: formData.rg,
        documentacaoEntregue: formData.documentacaoEntregue || false,
        certificadoEnviado: formData.certificadoEnviado || false,
        dataEnvioCertificado: formData.dataEnvioCertificado || null,
      });
      await gradeService.saveGrades(student.id, grades);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  const isComplete = () => {
    // Check if fundamental data is filled and at least some grades are entered
    const hasParents = formData.pai && formData.mae;
    const hasScores = grades.some(g => parseFloat(g.score?.replace(',', '.')) > 0);
    return hasParents && hasScores;
  };

  const handleConclude = async () => {
    if (!isComplete()) {
      alert('Preencha nome do pai, mãe e insira pelo menos uma nota antes de concluir.');
      return;
    }
    setLoading(true);
    try {
      await studentService.update(student.id, { 
        status: StudentStatus.DISP_IMPRESSAO,
        pai: formData.pai,
        mae: formData.mae,
        telefone2: formData.telefone2,
        email: formData.email,
        aluno: formData.aluno,
        ra: formData.ra,
        unidade: formData.unidade,
        periodo: formData.periodo,
        turma: formData.turma,
        turno: formData.turno,
        dataNascimento: formData.dataNascimento,
        cpf: formData.cpf,
        rg: formData.rg,
        documentacaoEntregue: formData.documentacaoEntregue || false,
        certificadoEnviado: formData.certificadoEnviado || false,
        dataEnvioCertificado: formData.dataEnvioCertificado || null,
      });
      await gradeService.saveGrades(student.id, grades);
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao finalizar registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#374151]/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl h-[600px] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{formData.aluno}</h3>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white border border-gray-100 px-1.5 py-0.5 rounded">RA {formData.ra}</span>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white border border-gray-100 px-1.5 py-0.5 rounded">{formData.unidade}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded transition-colors text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 border-r border-gray-50 space-y-8 bg-white">
            <section>
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Dados Fundamentais</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="Nome do Pai" value={formData.pai} onChange={(v) => handleUpdateStudent('pai', v)} />
                <InputField label="Nome da Mãe" value={formData.mae} onChange={(v) => handleUpdateStudent('mae', v)} />
                <InputField label="Data Nascimento" value={formData.dataNascimento} onChange={(v) => handleUpdateStudent('dataNascimento', v)} />
                <InputField label="CPF" value={formData.cpf} onChange={(v) => handleUpdateStudent('cpf', v)} />
                <InputField label="RG" value={formData.rg} onChange={(v) => handleUpdateStudent('rg', v)} />
              </div>
            </section>


            <section>
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Dados Escolares</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InputField label="Período" value={formData.periodo || ''} onChange={(v) => handleUpdateStudent('periodo', v)} />
                <InputField label="Turma" value={formData.turma || ''} onChange={(v) => handleUpdateStudent('turma', v)} />
                <InputField label="Turno" value={formData.turno || ''} onChange={(v) => handleUpdateStudent('turno', v)} />
                <InputField label="RA" value={formData.ra || ''} onChange={(v) => handleUpdateStudent('ra', v)} />
              </div>
            </section>

            <section>
              <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Contato do Aluno</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField label="WhatsApp / Telefone" value={formData.telefone2 || ''} onChange={(v) => handleUpdateStudent('telefone2', v)} />
                <InputField label="E-mail" value={formData.email} onChange={(v) => handleUpdateStudent('email', v)} />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Registro de Desempenho (EJA)</h4>
                <div className="text-[9px] font-bold text-gray-400 flex items-center gap-2">
                  <FileText size={10} /> BASE NACIONAL COMUM CURRICULAR
                </div>
              </div>

              {loadingGrades ? (
                <div className="py-8 text-center">
                  <Loader2 className="animate-spin mx-auto text-blue-600 mb-2" size={24} />
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Mapeando currículo...</span>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 w-[180px]">Área de Conhecimento</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200">Competências</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 w-[80px] text-center">Carga Horária</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider border-r border-gray-200 w-[80px] text-center">Nota</th>
                        <th className="px-3 py-2 text-[10px] font-bold text-gray-600 uppercase tracking-wider w-[120px] text-center">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {EJA_CURRICULAR_STRUCTURE.map((area, areaIdx) => (
                        area.competencies.map((comp, compIdx) => {
                          const gradeIdx = grades.findIndex(g => g.area === area.area && g.discipline === comp.name);
                          const grade = grades[gradeIdx] || { score: '', situation: '', hours: comp.hours };
                          
                          return (
                            <tr key={`${areaIdx}-${compIdx}`} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                              {compIdx === 0 && (
                                <td 
                                  className="px-3 py-2 align-middle border-r border-gray-200 bg-gray-50/30" 
                                  rowSpan={area.competencies.length}
                                >
                                  <span className="text-[10px] font-black text-gray-700 leading-tight block uppercase">
                                    {area.area}
                                  </span>
                                </td>
                              )}
                              <td className="px-3 py-2 border-r border-gray-200">
                                <span className="text-[11px] font-medium text-gray-600">
                                  {comp.name}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-center border-r border-gray-200 bg-gray-50/20">
                                <span className="text-[11px] font-bold text-gray-400">
                                  {comp.hours}
                                </span>
                              </td>
                              <td className="px-1.5 py-1 border-r border-gray-200">
                                <input 
                                  type="text" 
                                  value={grade.score} 
                                  onChange={(e) => handleGradeChange(gradeIdx, e.target.value)}
                                  className="w-full bg-white border border-gray-100 rounded px-2 py-1 text-xs text-center font-bold text-blue-600 focus:ring-1 focus:ring-blue-500 outline-none placeholder:text-gray-300"
                                  placeholder="0,0"
                                />
                              </td>
                              <td className="px-1.5 py-1 border-r border-gray-200">
                                <select
                                  value={grade.situation}
                                  onChange={(e) => handleSituationChange(gradeIdx, e.target.value)}
                                  className={`w-full bg-white border border-gray-100 rounded px-1 py-1 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-blue-500 appearance-none text-center cursor-pointer ${
                                    grade.situation === 'Aprovado' ? 'text-emerald-600' : 
                                    grade.situation === 'Competência Certificada' ? 'text-blue-600' :
                                    grade.situation === 'Reprovado' ? 'text-red-600' : 'text-gray-400'
                                  }`}
                                >
                                  <option value="">-</option>
                                  <option value="Aprovado">Aprovado</option>
                                  <option value="Competência Certificada">C. Certificada</option>
                                  <option value="Reprovado">Reprovado</option>
                                </select>
                              </td>
                            </tr>
                          );
                        })
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          {/* Side Info Panel */}
          <div className="w-[280px] bg-gray-50/50 p-6 flex flex-col overflow-y-auto">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Rastreadores</h4>
            
            <div className="space-y-3 mb-8">
              <div 
                className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${formData.documentacaoEntregue ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-gray-100 hover:border-emerald-200'}`}
                onClick={() => handleUpdateStudent('documentacaoEntregue', !formData.documentacaoEntregue)}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${formData.documentacaoEntregue ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                    <FileText size={14} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.documentacaoEntregue ? 'text-emerald-700' : 'text-gray-500'}`}>Documentação</span>
                </div>
                <div className={`w-3.5 h-3.5 rounded-full border-2 ${formData.documentacaoEntregue ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-200'}`} />
              </div>

              <div 
                className={`p-3 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all ${formData.certificadoEnviado ? 'bg-blue-50 border-blue-100' : 'bg-white border-gray-100 hover:border-blue-200'}`}
                onClick={() => handleUpdateStudent('certificadoEnviado', !formData.certificadoEnviado)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${formData.certificadoEnviado ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                      <CheckCircle size={14} />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${formData.certificadoEnviado ? 'text-blue-700' : 'text-gray-500'}`}>Enviado</span>
                  </div>
                  <div className={`w-3.5 h-3.5 rounded-full border-2 ${formData.certificadoEnviado ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-200'}`} />
                </div>
                {formData.certificadoEnviado && formData.dataEnvioCertificado && (
                  <p className="text-[9px] text-blue-400 font-bold uppercase tracking-widest pl-8">
                    EM: {new Date(formData.dataEnvioCertificado).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>

            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 text-center">Status & Ações</h4>
            
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Completude</p>
                <div className={`text-xs font-bold py-1.5 rounded ${isComplete() ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {isComplete() ? 'PRONTO PARA GERAR' : 'DADOS PENDENTES'}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full py-2 bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-lg transition-all text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Salvar Draft
              </button>
              
              <button
                onClick={handleConclude}
                disabled={loading || !isComplete()}
                className={`w-full py-2.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg ${
                  isComplete() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                }`}
              >
                <CheckCircle size={14} />
                Finalizar Registro
              </button>
            </div>

            {student.lastModifiedByName && (
              <div className="mt-auto pt-6 border-t border-gray-100">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">Último Acesso</p>
                <p className="text-[10px] text-gray-600 font-medium leading-tight">
                  Modificado por {student.lastModifiedByName.split(' ')[0]}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider ml-0.5">{label}</label>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
        placeholder={`Inserir ${label.toLowerCase()}`}
      />
    </div>
  );
}
