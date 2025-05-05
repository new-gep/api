import fitz  # PyMuPDF
import sys

# Caminho dos arquivos de entrada e saída passados como argumentos
input_path = sys.argv[1]
output_path = sys.argv[2]

# Carrega o PDF
doc = fitz.open(input_path)

# Salva o PDF comprimido com opções de otimização
doc.save(
    output_path,
    deflate=True,  # Comprime os dados
    garbage=4,     # Remove objetos não utilizados (máximo nível de "limpeza")
    clean=True     # Limpa o PDF
)

# Fecha o documento
doc.close()