import * as XLSX from 'xlsx';
import { Student } from '../types';

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

  exportBackup(students: Student[], grades: any[]) {
    const studentData = students.map(s => ({
      ...s,
      updatedAt: s.updatedAt?.toDate?.()?.toLocaleString() || s.updatedAt
    }));
    
    const wb = XLSX.utils.book_new();
    const wsStudents = XLSX.utils.json_to_sheet(studentData);
    const wsGrades = XLSX.utils.json_to_sheet(grades);
    
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Alunos');
    XLSX.utils.book_append_sheet(wb, wsGrades, 'Notas');
    
    XLSX.writeFile(wb, `backup_sistema_${new Date().toISOString().split('T')[0]}.xlsx`);
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
