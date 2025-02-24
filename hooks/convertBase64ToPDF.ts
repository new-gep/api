import { jsPDF } from 'jspdf';

async function ConvertBase64ToPDF(base64Image: string) {
  // Cria uma nova instância do jsPDF
  const doc = new jsPDF();

  // Adiciona a imagem ao PDF
  // Assume que a imagem é JPEG, mas você pode ajustar para PNG ou outros formatos
  doc.addImage(base64Image, 'PNG', 0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight());

  // Gera o PDF como um ArrayBuffer
  const pdfBuffer = doc.output('arraybuffer');
  // Supondo que você tenha um ArrayBuffer chamado "arrayBuffer"
  const uint8Array = new Uint8Array(pdfBuffer);
  // Se estiver em ambiente Node.js e precisar de um Buffer:
  const buffer = await Buffer.from(uint8Array);

  // Agora, utilize "uint8Array" ou "buffer" no seu upload

  return buffer;
}

export default ConvertBase64ToPDF;