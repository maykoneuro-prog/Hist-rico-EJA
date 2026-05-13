import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Grade } from '../types';
import { EJA_CURRICULAR_STRUCTURE } from '../constants';

async function loadPDFImage(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Falha ao carregar imagem: ' + url));
    img.src = url;
  });
}

export async function generateStudentPDF(data: Student | { student: Student, grades: Grade[] }[], individualGrades?: Grade[], letterhead?: string, isBulk = false) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const studentsToProcess = isBulk ? (data as { student: Student, grades: Grade[] }[]) : [{ student: data as Student, grades: individualGrades || [] }];
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  for (let i = 0; i < studentsToProcess.length; i++) {
    const { student, grades } = studentsToProcess[i];
    if (i > 0) doc.addPage();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    // 0. Background (Timbrado)
    if (letterhead) {
      try {
        if (letterhead.startsWith('http')) {
          const img = await loadPDFImage(letterhead);
          doc.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        } else {
          doc.addImage(letterhead, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }
      } catch (e) {
        console.error('Erro ao processar timbrado:', e);
      }
    }

    // Se tiver timbrado, começamos no ponto onde o texto deve iniciar (logo após o cabeçalho complexo)
    let currentY = letterhead ? 100 : 15;

    // 1. Identification Box e Identificação da Unidade (APENAS se NÃO houver timbrado)
    if (!letterhead) {
      doc.setLineWidth(0.3);
      doc.rect(margin, currentY, 55, 18); 
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('03.910.210/0005-39', margin + 27.5, currentY + 6, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('CADASTRO ESCOLAR: ' + (student.ra || '---'), margin + 27.5, currentY + 11, { align: 'center' });
      doc.text('UNIDADE RECIFE/PE', margin + 27.5, currentY + 15, { align: 'center' });
      
      currentY += 24;

      // Central Info
      const cleanUnidade = student.unidade?.replace(/^SESI\s+/i, '').toUpperCase() || 'UNIDADE';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Unidade: ${cleanUnidade}`, pageWidth / 2, currentY, { align: 'center' });

      currentY += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`Portaria: SEDUC Nº 4267 - D.O.E. de 30/06/2012 | Cadastro Escolar: P.000.219`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;
    }

    // 2. Title Section (Título do Documento - Barra Cinza)
    const turma = (student.turma || '').toUpperCase();
    let levelTitle = 'ENSINO MÉDIO';
    if (turma.includes('EF') || turma.includes('AF')) {
      levelTitle = 'ENSINO FUNDAMENTAL ANOS FINAIS';
    } else if (turma.includes('EM')) {
      levelTitle = 'ENSINO MÉDIO';
    }

    currentY -= 20; // Subir 2cm total
    doc.setLineWidth(0.5);
    doc.setFillColor(230, 230, 230);
    const barWidth = pageWidth - (margin * 2) - 4.5; // Ajustado conforme pedido (metade do ajuste anterior)
    const barX = margin + 1; // Trazer mais para a esquerda
    doc.rect(barX, currentY, barWidth, 15, 'F');
    doc.rect(barX, currentY, barWidth, 15, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CERTIFICADO E HISTÓRICO ESCOLAR', pageWidth / 2, currentY + 6, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`${levelTitle} - EDUCAÇÃO DE JOVENS E ADULTOS`, pageWidth / 2, currentY + 11, { align: 'center' });
    
    currentY += 22; 

    // 3. Statement Paragraph (Texto de certificação longo seguindo modelo Olga)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Format date properly
    let birthDateStr = student.dataNascimento || '';
    if (birthDateStr) {
      if (birthDateStr.includes('/')) {
        const parts = birthDateStr.split('/');
        const day = parts[0];
        const monthNum = parseInt(parts[1]);
        const month = months[monthNum - 1] || 'janeiro';
        const year = parts[2]?.split(' ')[0];
        birthDateStr = `${day} de ${month.toUpperCase()} de ${year}`;
      } else if (birthDateStr.includes('-')) {
        const parts = birthDateStr.split(' ')[0].split('-');
        const year = parts[0];
        const monthNum = parseInt(parts[1]);
        const day = parts[2];
        const month = months[monthNum - 1] || 'janeiro';
        birthDateStr = `${day} de ${month.toUpperCase()} de ${year}`;
      }
    }
    
    const parentsStr = `${(student.pai || '').toUpperCase()} e ${(student.mae || '').toUpperCase()}`;
    const naturalidade = student.unidade?.toUpperCase().includes('CARUARU') ? 'CARUARU/PE' : 'RECIFE/PE';
    const completionYear = student.periodo?.split('/')[0] || '2024';

    const statement = `Pelo presente Histórico Escolar, certificamos que ${(student.aluno || '').toUpperCase()}, filho (a) de ${parentsStr}, nascido (a) em ${birthDateStr}, natural de ${naturalidade}, nacionalidade brasileira, portador (a) do CPF nº ${student.cpf || '---'} e nº de identificação ${student.rg || '---'}, expedido pelo órgão SDS/PE, concluiu o ${levelTitle} no ano de ${completionYear}, nos termos da Lei nº 9.394/96 de 20 de dezembro de 1996.`;
    
    doc.text(statement, 18, currentY, { 
      align: 'justify',
      maxWidth: pageWidth - 36,
      lineHeightFactor: 1.4
    });

    currentY += 18;

    // 4. Grades Table
    const grouped: Record<string, Grade[]> = {};
    grades.forEach(g => {
      if (!grouped[g.area]) grouped[g.area] = [];
      grouped[g.area].push(g);
    });

    const tableBody: any[] = [];
    EJA_CURRICULAR_STRUCTURE.forEach(areaConfig => {
      const items = grouped[areaConfig.area];
      if (items) {
        const sortedItems = [...items].sort((a, b) => {
          const indexA = areaConfig.competencies.findIndex(c => c.name === a.discipline);
          const indexB = areaConfig.competencies.findIndex(c => c.name === b.discipline);
          if (indexA === -1 || indexB === -1) {
            const numA = parseInt(a.discipline.replace(/\D/g, '')) || 0;
            const numB = parseInt(b.discipline.replace(/\D/g, '')) || 0;
            return numA - numB;
          }
          return indexA - indexB;
        });

        sortedItems.forEach((grade, idx) => {
          const row: any[] = [];
          if (idx === 0) {
            row.push({ 
              content: areaConfig.area, 
              rowSpan: sortedItems.length, 
              styles: { valign: 'middle', halign: 'left', fontStyle: 'bold' } 
            });
          }
          row.push(grade.discipline);
          row.push(grade.hours.toString());
          const formattedScore = parseFloat((grade.score || '0').replace(',', '.')).toFixed(2).replace('.', ',');
          row.push(formattedScore);
          row.push(grade.situation);
          tableBody.push(row);
        });
      }
    });

    autoTable(doc, {
      startY: currentY,
      margin: { left: 18, right: 18 }, 
      head: [['Área de Conhecimento', 'Competências', 'Carga Horária', 'Nota', 'Situação']],
      body: tableBody,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, textColor: [0, 0, 0], lineColor: [0, 0, 0] },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 15, halign: 'center' },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 1;
    const totalHours = grades.reduce((acc, curr) => acc + curr.hours, 0);

    autoTable(doc, {
      startY: finalY,
      margin: { left: 18, right: 18 },
      body: [[
        { content: 'Percentual de Frequência:', styles: { fontStyle: 'bold' } },
        '80%',
        { content: 'Total da Carga Horária:', styles: { fontStyle: 'bold' } },
        `${totalHours} h`,
        { content: 'Situação Final:', styles: { fontStyle: 'bold' } },
        'Progressão Plena'
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], textColor: [0, 0, 0] },
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 15, halign: 'center' }, 2: { cellWidth: 35 }, 3: { cellWidth: 15, halign: 'center' }, 4: { cellWidth: 25 }, 5: { halign: 'center' } }
    });

    const obsY = (doc as any).lastAutoTable.finalY + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(230, 230, 230);
    doc.rect(18, obsY, pageWidth - 36, 5, 'F');
    doc.text('INFORMAÇÕES COMPLEMENTARES | OBSERVAÇÕES', pageWidth / 2, obsY + 3.8, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    const obs = [
      '• Competência Certificada – Estudante obteve a competência reconhecida mediante processo de Reconhecimento de Saberes.',
      '• Situação "Aprovado" equivale a "Progressão Plena".',
      '• Aluno (a) com dispensa de Educação Física, com base na Lei Federal nº 9.394/96, Art. 26, § 3º.',
      '• Documento assinado digitalmente por meio da plataforma TOTVS Assinatura Eletrônica, nos termos da Lei nº 14.063/2020, com plena validade jurídica.'
    ];
    
    let obsCurrentY = obsY + 9;
    obs.forEach((line) => {
      const lines = doc.splitTextToSize(line, pageWidth - 36);
      doc.text(lines, 18, obsCurrentY);
      obsCurrentY += (lines.length * 4);
    });

    const footerY = obsY + 28;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setFillColor(230, 230, 230);
    doc.rect(18, footerY, pageWidth - 36, 5, 'F');
    doc.text('ASSINATURAS', pageWidth / 2, footerY + 3.8, { align: 'center' });
    
    const unitCity = student.unidade?.toUpperCase().includes('CARUARU') ? 'Caruaru' : 'Recife';
    const today = new Date();
    const currentDay = today.getDate().toString().padStart(2, '0');
    const currentMonth = months[today.getMonth()];
    const currentYear = today.getFullYear();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${unitCity}, ${currentDay} de ${currentMonth} de ${currentYear}`, pageWidth / 2, footerY + 12, { align: 'center' });
  }

  const fileName = isBulk ? `historicos_lote_${new Date().getTime()}.pdf` : `historico_${(studentsToProcess[0].student.aluno || 'aluno').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
  return true;
}

export async function generateDeclarationPDF(data: Student | Student[], letterhead?: string, isBulk = false) {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const studentsToProcess = isBulk ? (data as Student[]) : [data as Student];

  for (let i = 0; i < studentsToProcess.length; i++) {
    const student = studentsToProcess[i];
    if (i > 0) doc.addPage();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // 0. Background (Timbrado)
    if (letterhead) {
      try {
        if (letterhead.startsWith('http')) {
          const img = await loadPDFImage(letterhead);
          doc.addImage(img, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        } else {
          doc.addImage(letterhead, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
        }
      } catch (e) {
        console.error('Erro ao processar timbrado:', e);
      }
    }

    let currentY = letterhead ? 160 : 110;

    // Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    
    const formattedDate = (student.dataNascimento || '').split(' ')[0].split('-').reverse().join('/') || student.dataNascimento;
    const unitName = student.unidade?.replace(/^SESI\s+/i, '').toUpperCase() || 'SESI';
    const studentName = (student.aluno || '').toUpperCase();
    const parentNames = `${(student.pai || '').toUpperCase()} e ${(student.mae || '').toUpperCase()}`;
    const courseInfo = `NOVA EJA - ENSINO MÉDIO – ${student.periodo?.split('/')[0] || '2026'}.1, TURMA ${student.turma || 'A'}`;
    const turnInfo = student.turno || 'noite';

    const declarationText = `Declaramos para os devidos fins que o (a) estudante ${studentName}, filho de ${parentNames}, nascido (a) em ${formattedDate}, natural de SALGUEIRO/PE, portador (a) do CPF: ${student.cpf}, está devidamente matriculado (a) na turma ${courseInfo}, com aulas no turno da ${turnInfo}, na modalidade da Educação de Jovens e Adultos, nesta instituição de ensino até a emissão deste documento.`;

    doc.text(declarationText, margin, currentY, { align: 'justify', maxWidth: pageWidth - (margin * 2), lineHeightFactor: 1.5 });
    currentY += 40;

    const city = unitName.includes('CARUARU') ? 'Caruaru' : 'Recife';
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.setFont('helvetica', 'bold');
    doc.text(`${city}, ${today}.`, pageWidth / 2, currentY, { align: 'center' });
  }

  const fileName = isBulk ? `declaracoes_lote_${new Date().getTime()}.pdf` : `declaracao_${(studentsToProcess[0].aluno || 'aluno').replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
  return true;
}
