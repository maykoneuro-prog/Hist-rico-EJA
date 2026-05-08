import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Student, Grade, StudentStatus, AuditLog, AppUser, AppSettings } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const userService = {
  async getProfile(uid: string) {
    const path = `users/${uid}`;
    try {
      const docRef = doc(db, 'users', uid);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { uid: snapshot.id, ...snapshot.data() } as AppUser;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async syncProfile(user: any) {
    const path = `users/${user.uid}`;
    try {
      const existing = await this.getProfile(user.uid);
      const isMasterEmail = user.email === 'maykon.euro@gmail.com' || user.email === 'm.vascogonsalves@gmail.com';

      if (existing) {
        // Se for o e-mail master mas ainda não for admin ou aprovado, atualiza
        if (isMasterEmail && (!existing.isAdmin || !existing.isApproved)) {
          console.log("Elevando usuário master para administrador...");
          await updateDoc(doc(db, 'users', user.uid), {
            isAdmin: true,
            isApproved: true,
            role: 'ADMIN'
          });
          return { ...existing, isAdmin: true, isApproved: true, role: 'ADMIN' };
        }
        return existing;
      }

      // Novo usuário
      const profile: AppUser = {
        uid: user.uid,
        email: user.email || '',
        name: user.displayName || user.email || 'Usuário',
        role: isMasterEmail ? 'ADMIN' : 'USER',
        isAdmin: isMasterEmail,
        isApproved: isMasterEmail,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), profile);
      return profile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getAllPending() {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), where('isApproved', '==', false));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getAll() {
    const path = 'users';
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async approve(uid: string) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), { 
        isApproved: true,
        role: 'USER'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async elevateToAdmin(uid: string) {
    const path = `users/${uid}`;
    try {
      await updateDoc(doc(db, 'users', uid), { 
        isAdmin: true,
        isApproved: true,
        role: 'ADMIN'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async delete(uid: string) {
    const path = `users/${uid}`;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};

export const settingsService = {
  async getSettings(): Promise<AppSettings | null> {
    const path = 'settings/global';
    try {
      const docRef = doc(db, 'settings', 'global');
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return snapshot.data() as AppSettings;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  },

  async updateSettings(data: AppSettings) {
    const path = 'settings/global';
    try {
      await setDoc(doc(db, 'settings', 'global'), data, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};

export const studentService = {
  async getAll() {
    const path = 'students';
    try {
      const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async getById(id: string) {
    const path = `students/${id}`;
    try {
      const docRef = doc(db, 'students', id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Student;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async upsertMany(students: any[], onProgress?: (progress: number) => void) {
    const path = 'students';
    const batchSize = 50;
    const stats = { added: 0, errors: 0 };
    const total = students.length;

    // Process in chunks of 50
    for (let i = 0; i < total; i += batchSize) {
      const chunk = students.slice(i, i + batchSize);
      const batch = writeBatch(db);

      chunk.forEach(data => {
        if (!data.ra || !data.unidade) return;
        
        // Normalização dos dados para evitar duplicatas por espaços ou casos diferentes
        const ra = data.ra.toString().trim().toUpperCase();
        const unidade = data.unidade.toString().trim().toUpperCase();
        
        // Chave única: Unidade + RA para permitir mesmo RA em escolas diferentes
        const combinedId = `${unidade}_${ra}`.replace(/[^A-Z0-9]/g, '_');
        const docRef = doc(db, 'students', combinedId);
        
        const studentData = {
          ...data,
          ra,
          unidade,
          status: data.status || StudentStatus.PENDENTE,
          updatedAt: serverTimestamp(),
          lastModifiedBy: auth.currentUser?.uid || 'system',
          lastModifiedByName: auth.currentUser?.displayName || 'Importação'
        };

        batch.set(docRef, studentData, { merge: true });
        stats.added++;
      });

      try {
        await batch.commit();
        if (onProgress) {
          const progress = Math.min(100, Math.round(((i + chunk.length) / total) * 100));
          onProgress(progress);
        }
      } catch (error) {
        console.error('Batch commit error:', error);
        stats.errors += chunk.length;
      }
    }
    return stats;
  },

  async create(data: Omit<Student, 'id' | 'updatedAt'>) {
    const path = 'students';
    try {
      const docRef = doc(collection(db, path));
      const studentData = {
        ...data,
        status: StudentStatus.PENDENTE,
        updatedAt: serverTimestamp(),
      };
      await setDoc(docRef, studentData);
      return { id: docRef.id, ...studentData };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  async update(id: string, data: Partial<Student>) {
    const path = `students/${id}`;
    try {
      const docRef = doc(db, 'students', id);
      
      // Filter out undefined fields to prevent Firestore errors
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      const updateData = {
        ...cleanData,
        updatedAt: serverTimestamp(),
        lastModifiedBy: auth.currentUser?.uid,
        lastModifiedByName: auth.currentUser?.displayName || auth.currentUser?.email
      };
      await updateDoc(docRef, updateData);
      
      // Log the change
      await addAuditLog(id, `Update: ${Object.keys(cleanData).join(', ')}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },

  async delete(id: string) {
    const path = `students/${id}`;
    try {
      await deleteDoc(doc(db, 'students', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async cleanDuplicates(onProgress?: (progress: number) => void) {
    const path = 'students';
    console.log('Iniciando saneamento de base...');
    try {
      const querySnapshot = await getDocs(collection(db, path));
      const allDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const groups = new Map<string, any[]>();
      
      allDocs.forEach(doc => {
        if (!doc.ra || !doc.unidade) return;
        const key = `${doc.unidade}_${doc.ra}`.toString().trim().replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(doc);
      });

      const toDelete: string[] = [];

      groups.forEach((docs, key) => {
        if (docs.length <= 1) return;

        // Se houver duplicatas, decidimos qual manter
        // 1. Preferência por documentos cujo ID é exatamente a chave (ID perfeito)
        // 2. Se nenhum, preferência pelo mais recentemente atualizado
        docs.sort((a, b) => {
          if (a.id === key) return -1;
          if (b.id === key) return 1;
          
          const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
          const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
          return timeB - timeA;
        });

        // O primeiro da lista sorteada é o que manteremos
        const [toKeep, ...duplicates] = docs;
        duplicates.forEach(d => toDelete.push(d.id));
      });

      console.log(`Documentos identificados para remoção: ${toDelete.length}`);
      if (toDelete.length === 0) return 0;

      const batchSize = 50;
      let deletedCount = 0;
      
      // Remover duplicatas do array toDelete para evitar erros de batch
      const uniqueToDelete = Array.from(new Set(toDelete));

      for (let i = 0; i < uniqueToDelete.length; i += batchSize) {
        const chunk = uniqueToDelete.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(id => {
          batch.delete(doc(db, 'students', id));
        });
        await batch.commit();
        deletedCount += chunk.length;
        
        if (onProgress) {
          const progress = Math.min(100, Math.round((deletedCount / uniqueToDelete.length) * 100));
          onProgress(progress);
        }
      }
      return deletedCount;
    } catch (error) {
      console.error('Erro no saneamento:', error);
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  subscribe(callback: (students: Student[]) => void) {
    const path = 'students';
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
      callback(students);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async deleteAll() {
    const paths = ['students', 'auditLogs'];
    let totalDeleted = 0;
    
    try {
      // 1. Delete Audit Logs in chunks
      const auditSnapshot = await getDocs(collection(db, 'auditLogs'));
      const auditDocs = auditSnapshot.docs;
      for (let i = 0; i < auditDocs.length; i += 50) {
        const batch = writeBatch(db);
        const chunk = auditDocs.slice(i, i + 50);
        chunk.forEach(d => batch.delete(d.ref));
        await batch.commit();
        totalDeleted += chunk.length;
      }

      // 2. Delete Students and their Grades subcollections
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      const studentDocs = studentsSnapshot.docs;
      
      for (const studentDoc of studentDocs) {
        // Find and delete all grades for this student
        const gradesSnapshot = await getDocs(collection(db, 'students', studentDoc.id, 'grades'));
        const gradeDocs = gradesSnapshot.docs;
        
        for (let i = 0; i < gradeDocs.length; i += 50) {
          const batch = writeBatch(db);
          const chunk = gradeDocs.slice(i, i + 50);
          chunk.forEach(d => batch.delete(d.ref));
          await batch.commit();
        }
        
        // Delete the student doc itself
        await deleteDoc(studentDoc.ref);
        totalDeleted++;
      }
      
      return totalDeleted;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'students/auditLogs');
    }
  }
};

export const gradeService = {
  async getByStudentId(studentId: string) {
    const path = `students/${studentId}/grades`;
    try {
      const q = query(collection(db, 'students', studentId, 'grades'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  },

  async saveGrades(studentId: string, grades: Grade[]) {
    const path = `students/${studentId}/grades`;
    try {
      const batch = writeBatch(db);
      
      for (const grade of grades) {
        // Filtrar campos undefined e remover o ID do corpo do documento
        const { id, ...data } = grade;
        const cleanData = Object.fromEntries(
          Object.entries(data).filter(([_, v]) => v !== undefined)
        );

        if (id) {
          const docRef = doc(db, 'students', studentId, 'grades', id);
          batch.update(docRef, cleanData);
        } else {
          const docRef = doc(collection(db, 'students', studentId, 'grades'));
          batch.set(docRef, cleanData);
        }
      }
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }
};

async function addAuditLog(studentId: string, action: string) {
  const path = 'auditLogs';
  try {
    await addDoc(collection(db, path), {
      studentId,
      userId: auth.currentUser?.uid,
      userName: auth.currentUser?.displayName || auth.currentUser?.email,
      action,
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}
