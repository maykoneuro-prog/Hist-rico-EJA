import * as XLSX from 'xlsx';
import { Student, AppUser, AuditLog } from '../types';

export const excelService = {
  downloadTemplate() {
    const data = [
      ['UNIDADE', 'PERIODO', 'RA', 'TURMA', 'ALUNO', 'DATA NASCIMENTO', 'CPF', 'RG', 'TELEFONE2', 'EMAIL', 'MAE', 'PAI', 'ANO CONCLUSAO']
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'modelo_importacao_alunos.xlsx');
  },

  async parseFile(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  exportBackup(students: Student[], grades: any[], users: AppUser[], auditLogs: AuditLog[]) {
    const wb = XLSX.utils.book_new();

    // 1. Sheet: Alunos
    const studentData = students.map(s => ({
      'ID Único': s.id,
      'Unidade': s.unidade,
      'Ano Conclusão': s.anoConclusao || s.periodo,
      'Período': s.periodo,
      'RA': s.ra,
      'Turma': s.turma,
      'Aluno': s.aluno,
      'Data Nascimento': s.dataNascimento,
      'CPF': s.cpf,
      'RG': s.rg,
      'Telefone': s.telefone2 || '',
      'Email': s.email || '',
      'Mãe': s.mae,
      'Pai': s.pai,
      'Status': s.status,
      'Doc. Entregue': s.documentacaoEntregue ? 'SIM' : 'NÃO',
      'Cert. Enviado': s.certificadoEnviado ? 'SIM' : 'NÃO',
      'Data Envio Cert.': s.dataEnvioCertificado ? (s.dataEnvioCertificado.toDate?.()?.toLocaleString() || s.dataEnvioCertificado) : '',
      'Última Modificação': s.updatedAt?.toDate?.()?.toLocaleString() || s.updatedAt,
      'Modificado Por': s.lastModifiedByName || s.lastModifiedBy || ''
    }));
    const wsStudents = XLSX.utils.json_to_sheet(studentData);
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Alunos');

    // 2. Sheet: Notas
    const gradeData = grades.map(g => ({
      'ID Aluno': g.studentId,
      'Nome Aluno': g.aluno,
      'Disciplina': g.discipline,
      'Nota/Frequência': g.score,
      'Área': g.area,
      'Carga Horária': g.hours,
      'Situação': g.situation
    }));
    const wsGrades = XLSX.utils.json_to_sheet(gradeData);
    XLSX.utils.book_append_sheet(wb, wsGrades, 'Notas');

    // 3. Sheet: Usuários (Sistema)
    const userData = users.map(u => ({
      'UID': u.uid,
      'Nome': u.name,
      'Email': u.email,
      'Papel': u.role,
      'Admin': u.isAdmin ? 'SIM' : 'NÃO',
      'Aprovado': u.isApproved ? 'SIM' : 'NÃO',
      'Ativo': u.isActive !== false ? 'SIM' : 'NÃO',
      'Criado em': u.createdAt?.toDate?.()?.toLocaleString() || u.createdAt
    }));
    const wsUsers = XLSX.utils.json_to_sheet(userData);
    XLSX.utils.book_append_sheet(wb, wsUsers, 'Operadores');

    // 4. Sheet: Auditoria
    const logData = auditLogs.map(l => ({
      'Data/Hora': l.timestamp?.toDate?.()?.toLocaleString() || l.timestamp,
      'Operador': l.userName || l.userId,
      'Ação': l.action,
      'ID Aluno': l.studentId
    }));
    const wsLogs = XLSX.utils.json_to_sheet(logData);
    XLSX.utils.book_append_sheet(wb, wsLogs, 'Logs de Auditoria');
    
    // Auto-size columns (basic approach)
    [wsStudents, wsGrades, wsUsers, wsLogs].forEach(ws => {
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      const cols = [];
      for (let i = 0; i <= range.e.c; i++) cols.push({ wch: 20 });
      ws['!cols'] = cols;
    });

    XLSX.writeFile(wb, `backup_completo_eja_${new Date().toISOString().split('T')[0]}.xlsx`);
  }
};

export const mapExcelToStudent = (item: any) => {
  return {
    unidade: item['UNIDADE']?.toString() || item['Escola']?.toString() || '',
    periodo: item['PERIODO']?.toString() || item['Ano']?.toString() || '',
    ra: item['RA']?.toString() || '',
    turma: item['TURMA']?.toString() || '',
    aluno: item['ALUNO']?.toString() || '',
    dataNascimento: item['DATA NASCIMENTO']?.toString() || item['DT NASCIM.']?.toString() || '',
    cpf: item['CPF']?.toString() || '',
    rg: item['RG']?.toString() || '',
    telefone2: item['TELEFONE2']?.toString() || item['TELEFONE']?.toString() || '',
    email: item['EMAIL']?.toString() || '',
    mae: item['MAE']?.toString() || '',
    pai: item['PAI']?.toString() || '',
    anoConclusao: item['ANO CONCLUSAO']?.toString() || item['PERIODO']?.toString() || '',
    documentacaoEntregue: false,
    certificadoEnviado: false,
    dataEnvioCertificado: null,
  };
};
