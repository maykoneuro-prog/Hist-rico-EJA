export enum StudentStatus {
  PENDENTE = 'PENDENTE',
  DISP_IMPRESSAO = 'DISP_IMPRESSAO',
  CERT_GERADO = 'CERT_GERADO'
}

export interface Letterhead {
  id: string;
  name: string;
  url: string;
}

export interface AppSettings {
  letterheads?: Letterhead[];
}

export interface Student {
  id: string;
  unidade: string;
  periodo: string;
  ra: string;
  turma: string;
  anoConclusao: string;
  aluno: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  telefone2?: string;
  email: string;
  pai: string;
  mae: string;
  status: StudentStatus;
  documentacaoEntregue: boolean;
  certificadoEnviado: boolean;
  dataEnvioCertificado?: any;
  updatedAt: any;
  lastModifiedBy: string;
  lastModifiedByName: string;
}

export interface Grade {
  id?: string;
  discipline: string;
  score: string;
  area: string;
  hours: number;
  situation: string;
}

export interface AuditLog {
  id: string;
  studentId: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: any;
}

// v1.0.1 - Sync trigger
export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isApproved: boolean;
  isActive?: boolean;
  createdAt: any;
}
