const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const pngToIco = require('png-to-ico');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const app = express();
const port = Number(process.env.PORT || 3001);
const allowedImageFormats = new Set(['png', 'jpeg', 'jpg', 'webp', 'ico', 'svg']);

ffmpeg.setFfmpegPath(ffmpegPath);

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 }
});

const videoUpload = multer({
  dest: path.join(os.tmpdir(), 'converter-flow-video'),
  limits: { fileSize: 250 * 1024 * 1024 }
});

const normalizeFormat = (format) => {
  if (!format) {
    return 'webp';
  }

  const normalized = String(format).toLowerCase().trim();
  return normalized === 'jpg' ? 'jpeg' : normalized;
};

const toInt = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return Math.max(1, Math.floor(parsed));
};

const toQuality = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 82;
  }

  return Math.min(100, Math.max(1, Math.floor(parsed)));
};

const toTargetBytes = (targetSizeKB) => {
  const parsed = Number(targetSizeKB);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }

  return Math.floor(parsed * 1024);
};

const createSvgFromRaster = async (inputBuffer, width, height, quality) => {
  const pngBuffer = await sharp(inputBuffer)
    .resize({ width, height, withoutEnlargement: true, fit: 'inside' })
    .png({ quality, compressionLevel: Math.round((100 - quality) / 10) })
    .toBuffer();

  const metadata = await sharp(pngBuffer).metadata();
  const finalWidth = metadata.width || width || 1;
  const finalHeight = metadata.height || height || 1;
  const base64 = pngBuffer.toString('base64');

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${finalWidth}" height="${finalHeight}" viewBox="0 0 ${finalWidth} ${finalHeight}"><image href="data:image/png;base64,${base64}" width="${finalWidth}" height="${finalHeight}"/></svg>`
  );
};

const buildSharpOutput = async (inputBuffer, format, width, height, quality) => {
  const pipeline = sharp(inputBuffer).rotate();

  if (width || height) {
    pipeline.resize({ width, height, fit: 'inside', withoutEnlargement: true });
  }

  if (format === 'png') {
    return pipeline.png({ quality, compressionLevel: Math.round((100 - quality) / 10) }).toBuffer();
  }

  if (format === 'webp') {
    return pipeline.webp({ quality }).toBuffer();
  }

  if (format === 'jpeg') {
    return pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
  }

  return pipeline.toFormat(format).toBuffer();
};

const optimizeToTargetSize = async (inputBuffer, format, width, height, quality, targetBytes) => {
  let workingQuality = quality;
  let bestBuffer;

  for (let index = 0; index < 9; index += 1) {
    const candidate = await buildSharpOutput(inputBuffer, format, width, height, workingQuality);

    if (!bestBuffer || candidate.length < bestBuffer.length) {
      bestBuffer = candidate;
    }

    if (!targetBytes || candidate.length <= targetBytes) {
      return candidate;
    }

    if (workingQuality <= 20) {
      break;
    }

    workingQuality -= 8;
  }

  return bestBuffer;
};

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/image/process', imageUpload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Arquivo de imagem não enviado.' });
    }

    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({ error: 'Envie um arquivo de imagem válido.' });
    }

    const format = normalizeFormat(req.body.format);
    if (!allowedImageFormats.has(format)) {
      return res.status(400).json({ error: 'Formato de saída não suportado.' });
    }

    const width = toInt(req.body.width);
    const height = toInt(req.body.height);
    const quality = toQuality(req.body.quality);
    const targetBytes = toTargetBytes(req.body.targetSizeKB);

    let outputBuffer;
    let outputMime;
    let outputExtension;

    if (format === 'svg') {
      outputBuffer = await createSvgFromRaster(req.file.buffer, width, height, quality);
      outputMime = 'image/svg+xml';
      outputExtension = 'svg';
    } else if (format === 'ico') {
      const pngBuffer = await optimizeToTargetSize(req.file.buffer, 'png', width, height, quality, targetBytes);
      outputBuffer = await pngToIco(pngBuffer);
      outputMime = 'image/x-icon';
      outputExtension = 'ico';
    } else {
      outputBuffer = await optimizeToTargetSize(req.file.buffer, format, width, height, quality, targetBytes);
      outputMime = `image/${format === 'jpg' ? 'jpeg' : format}`;
      outputExtension = format === 'jpeg' ? 'jpg' : format;
    }

    res.setHeader('Content-Type', outputMime);
    res.setHeader('Content-Disposition', `attachment; filename="convertida.${outputExtension}"`);
    res.setHeader('X-Output-Size-Bytes', String(outputBuffer.length));

    return res.send(outputBuffer);
  } catch (error) {
    return next(error);
  }
});

const runFfmpeg = (command) =>
  new Promise((resolve, reject) => {
    command.on('end', resolve).on('error', reject).run();
  });

app.post('/api/video/to-gif', videoUpload.single('file'), async (req, res, next) => {
  const inputPath = req.file?.path;
  const workingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'converter-flow-gif-'));
  const palettePath = path.join(workingDir, 'palette.png');
  const outputPath = path.join(workingDir, `saida-${Date.now()}.gif`);

  try {
    if (!inputPath) {
      return res.status(400).json({ error: 'Arquivo de vídeo não enviado.' });
    }

    const width = toInt(req.body.width) || 720;
    const height = toInt(req.body.height) || -1;
    const fps = Math.min(30, Math.max(8, Number(req.body.fps) || 12));

    const scaleFilter = `fps=${fps},scale=${width}:${height}:flags=lanczos:force_original_aspect_ratio=decrease`;

    await runFfmpeg(
      ffmpeg(inputPath)
        .outputOptions(['-vf', `${scaleFilter},palettegen=max_colors=256`])
        .output(palettePath)
    );

    await runFfmpeg(
      ffmpeg(inputPath)
        .input(palettePath)
        .outputOptions([
          '-lavfi',
          `${scaleFilter}[x];[x][1:v]paletteuse=dither=sierra2_4a`,
          '-loop',
          '0'
        ])
        .output(outputPath)
    );

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Disposition', 'attachment; filename="video.gif"');

    createReadStream(outputPath).pipe(res);

    res.on('finish', async () => {
      await Promise.allSettled([
        inputPath ? fs.unlink(inputPath) : Promise.resolve(),
        fs.rm(workingDir, { recursive: true, force: true })
      ]);
    });

    return undefined;
  } catch (error) {
    await Promise.allSettled([
      inputPath ? fs.unlink(inputPath) : Promise.resolve(),
      fs.rm(workingDir, { recursive: true, force: true })
    ]);
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  const message = error?.message || 'Erro interno ao processar arquivo.';
  res.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`API ativa em http://localhost:${port}`);
});
