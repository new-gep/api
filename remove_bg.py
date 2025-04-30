import cv2
import numpy as np
import sys

input_path = sys.argv[1]
output_path = sys.argv[2]

# Carregar imagem
image = cv2.imread(input_path, cv2.IMREAD_UNCHANGED)

# Converter para RGBA se não estiver
if image.shape[2] != 4:
    image = cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)

# Criar máscara para o fundo branco
gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
_, alpha = cv2.threshold(gray, 250, 255, cv2.THRESH_BINARY_INV)

# Aplicar máscara como canal alpha
image[:, :, 3] = alpha

# Salvar com fundo transparente
cv2.imwrite(output_path, image)
