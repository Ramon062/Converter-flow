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
  - O frontend já usa `/api` por padrão
  - Defina `VITE_API_URL` somente se quiser apontar para outra API

## Deploy na Vercel

- Este projeto está configurado para deploy do frontend na Vercel
- O backend deve ficar no Render ou Railway (recomendado para vídeos maiores)

- Passo a passo
  - Faça push do repositório para GitHub
  - Na Vercel, clique em `Add New Project` e importe o repositório
  - Mantenha as configurações padrão (a Vercel lerá `vercel.json`)
  - Clique em `Deploy`

- Após o deploy
  - Frontend: URL principal do projeto
  - API usada pelo frontend: valor configurado em `VITE_API_URL`

- Observação importante
  - Conversão de vídeos grandes pode exceder limites de tempo/memória de funções serverless

## Deploy recomendado para vídeos grandes

- Estratégia
  - Frontend na Vercel
  - Backend no Render ou Railway

- 1) Subir backend no Render
  - Faça push do repositório
  - No Render, crie um novo `Web Service`
  - O arquivo `render.yaml` já configura:
    - `rootDir`: `backend`
    - `buildCommand`: `npm install`
    - `startCommand`: `npm start`
    - healthcheck: `/api/health`
  - Em variáveis de ambiente, defina:
    - `CORS_ORIGIN=https://SEU-FRONTEND.vercel.app`

- 2) Subir backend no Railway (alternativa)
  - Crie um novo projeto com o mesmo repositório
  - Configure:
    - Root Directory: `backend`
    - Start Command: `npm start`
  - Em variáveis, defina:
    - `CORS_ORIGIN=https://SEU-FRONTEND.vercel.app`

- 3) Subir frontend na Vercel
  - Importe o repositório na Vercel
  - Em `Root Directory`, escolha `frontend`
  - Em variáveis de ambiente, defina:
    - `VITE_API_URL=https://SUA-API.onrender.com` (ou domínio Railway)

- 4) Validar integração
  - Abra o frontend e teste upload/conversão
  - Teste healthcheck da API: `https://SUA-API.../api/health`

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