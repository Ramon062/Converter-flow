# Converter Flow

Aplicação fullstack para processar mídia com foco em simplicidade e velocidade.

## Resumo

- Converter imagens entre formatos: `png`, `jpeg/jpg`, `webp`, `ico`, `svg`
- Redimensionar imagens por largura e altura
- Comprimir imagens por qualidade e/ou tamanho alvo (`KB`)
- Converter vídeos para GIF com ajuste de largura, altura e `FPS`

## Tecnologias

- Frontend: React + Vite
- Backend: Node.js + Express + Sharp + FFmpeg (`ffmpeg-static`)

## Requisitos

- Node.js 20+
- npm 10+

## Como executar

- Backend (`http://localhost:3001`)

```bash
cd backend
npm install
npm run dev
```

- Frontend (`http://localhost:5173`)

```bash
cd frontend
npm install
npm run dev
```

- Configuração opcional
  - Defina `VITE_API_URL` no frontend caso o backend rode em outra URL

## API

- `POST /api/image/process`
  - Tipo: `multipart/form-data`
  - Campos: `file`, `format`, `width`, `height`, `quality`, `targetSizeKB`

- `POST /api/video/to-gif`
  - Tipo: `multipart/form-data`
  - Campos: `file`, `width`, `height`, `fps`

## Observações

- `ffmpeg-static` já inclui binário do FFmpeg (sem instalação manual)
- Conversão para `svg` usa imagem incorporada em base64 quando a origem é raster
- Conversão para `ico` passa por PNG antes de gerar o arquivo final