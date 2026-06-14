# Converter Flow (React + Node)

Projeto fullstack para:
- Converter imagem entre `png`, `jpeg/jpg`, `webp`, `ico`, `svg`
- Redimensionar por largura/altura
- Comprimir imagem por qualidade e alvo de tamanho (KB)
- Converter vídeo para GIF com boa qualidade e tamanho reduzido

## Estrutura

- `frontend`: React + Vite
- `backend`: Node.js + Express + Sharp + FFmpeg

## Requisitos

- Node.js 20+
- npm 10+

## Executar backend

```bash
cd backend
npm install
npm run dev
```

API padrão: `http://localhost:3001`

Opcional: copie `backend/.env.example` para `backend/.env`.

## Executar frontend

```bash
cd frontend
npm install
npm run dev
```

App padrão: `http://localhost:5173`

Se necessário, configure `VITE_API_URL` no frontend apontando para o backend.

## Endpoints principais

- `POST /api/image/process`
  - `multipart/form-data`
  - campos: `file`, `format`, `width`, `height`, `quality`, `targetSizeKB`
- `POST /api/video/to-gif`
  - `multipart/form-data`
  - campos: `file`, `width`, `height`, `fps`

## Observações

- O backend usa `ffmpeg-static`, então não precisa instalar FFmpeg manualmente.
- Conversão para `svg` gera um SVG com imagem incorporada (base64) quando a origem é raster.
- Para `ico`, a geração passa por PNG antes de criar o ícone final.