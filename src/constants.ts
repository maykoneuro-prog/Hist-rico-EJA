export const EJA_MEDIO_STRUCTURE = [
  {
    area: 'Ciências da Natureza e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 48 },
      { name: 'Competência 2', hours: 60 },
      { name: 'Competência 3', hours: 100 },
      { name: 'Competência 4', hours: 32 },
    ]
  },
  {
    area: 'Linguagens, Códigos e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 72 },
      { name: 'Competência 2', hours: 144 },
      { name: 'Competência 3', hours: 72 },
      { name: 'Competência 4', hours: 72 },
    ]
  },
  {
    area: 'Matemática e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 60 },
      { name: 'Competência 2', hours: 90 },
      { name: 'Competência 3', hours: 120 },
      { name: 'Competência 4', hours: 30 },
      { name: 'Competência 5', hours: 60 },
    ]
  },
  {
    area: 'Ciências Humanas e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 88 },
      { name: 'Competência 2', hours: 50 },
      { name: 'Competência 3', hours: 52 },
      { name: 'Competência 4', hours: 50 },
    ]
  }
];

export const EJA_FUNDAMENTAL_STRUCTURE = [
  {
    area: 'Linguagens, Códigos e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 36 },
      { name: 'Competência 2', hours: 126 },
      { name: 'Competência 3', hours: 72 },
      { name: 'Competência 4', hours: 90 },
      { name: 'Competência 5', hours: 36 },
    ]
  },
  {
    area: 'Matemática e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 90 },
      { name: 'Competência 2', hours: 120 },
      { name: 'Competência 3', hours: 90 },
      { name: 'Competência 4', hours: 60 },
    ]
  },
  {
    area: 'Ciências Humanas e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 96 },
      { name: 'Competência 2', hours: 48 },
      { name: 'Competência 3', hours: 48 },
      { name: 'Competência 4', hours: 48 },
    ]
  },
  {
    area: 'Ciências da Natureza e suas Tecnologias',
    competencies: [
      { name: 'Competência 1', hours: 48 },
      { name: 'Competência 2', hours: 48 },
      { name: 'Competência 3', hours: 96 },
      { name: 'Competência 4', hours: 24 },
      { name: 'Competência 5', hours: 24 },
    ]
  }
];

export const getCurricularStructure = (nivel?: 'medio' | 'fundamental') => {
  return nivel === 'fundamental' ? EJA_FUNDAMENTAL_STRUCTURE : EJA_MEDIO_STRUCTURE;
};
