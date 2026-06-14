import { useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

const imageFormats = ['png', 'jpeg', 'jpg', 'webp', 'ico', 'svg'];

const toDownloadName = (kind, format) => {
  if (kind === 'gif') {
    return 'video-convertido.gif';
  }

  const extension = format === 'jpeg' ? 'jpg' : format;
  return `imagem-convertida.${extension}`;
};

function App() {
  const [mode, setMode] = useState('image');
  const [imageTool, setImageTool] = useState('convert');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const [imageFile, setImageFile] = useState(null);
  const [imageFormat, setImageFormat] = useState('webp');
  const [imageWidth, setImageWidth] = useState('');
  const [imageHeight, setImageHeight] = useState('');
  const [imageQuality, setImageQuality] = useState('82');
  const [imageTargetSize, setImageTargetSize] = useState('');

  const [videoFile, setVideoFile] = useState(null);
  const [gifWidth, setGifWidth] = useState('720');
  const [gifHeight, setGifHeight] = useState('');
  const [gifFps, setGifFps] = useState('12');

  const statusClass = useMemo(() => {
    if (status.type === 'error') {
      return 'status error';
    }

    if (status.type === 'success') {
      return 'status success';
    }

    return 'status';
  }, [status.type]);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitImage = async (event) => {
    event.preventDefault();

    if (!imageFile) {
      setStatus({ type: 'error', message: 'Selecione uma imagem para converter.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const formData = new FormData();
      formData.append('file', imageFile);
      formData.append('format', imageFormat);

      if (imageTool === 'resize' && imageWidth) {
        formData.append('width', imageWidth);
      }

      if (imageTool === 'resize' && imageHeight) {
        formData.append('height', imageHeight);
      }

      if (imageTool === 'compress' && imageQuality) {
        formData.append('quality', imageQuality);
      }

      if (imageTool === 'compress' && imageTargetSize) {
        formData.append('targetSizeKB', imageTargetSize);
      }

      const response = await fetch(`${API_URL}/api/image/process`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao converter imagem.');
      }

      const blob = await response.blob();
      downloadBlob(blob, toDownloadName('image', imageFormat));

      const sizeBytes = Number(response.headers.get('X-Output-Size-Bytes'));
      const sizeInfo = Number.isFinite(sizeBytes) ? ` (${(sizeBytes / 1024).toFixed(1)} KB)` : '';
      setStatus({ type: 'success', message: `Imagem convertida com sucesso${sizeInfo}.` });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  const submitVideo = async (event) => {
    event.preventDefault();

    if (!videoFile) {
      setStatus({ type: 'error', message: 'Selecione um vídeo para converter em GIF.' });
      return;
    }

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const formData = new FormData();
      formData.append('file', videoFile);
      if (gifWidth) {
        formData.append('width', gifWidth);
      }
      if (gifHeight) {
        formData.append('height', gifHeight);
      }
      if (gifFps) {
        formData.append('fps', gifFps);
      }

      const response = await fetch(`${API_URL}/api/video/to-gif`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Falha ao converter vídeo em GIF.');
      }

      const blob = await response.blob();
      downloadBlob(blob, toDownloadName('gif'));
      setStatus({ type: 'success', message: 'GIF gerado com sucesso.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">Converter Flow</div>
        <nav className="topmenu">
          <button
            type="button"
            className={mode === 'image' && imageTool === 'compress' ? 'active' : ''}
            onClick={() => {
              setMode('image');
              setImageTool('compress');
            }}
          >
            Comprimir Imagem
          </button>
          <button
            type="button"
            className={mode === 'image' && imageTool === 'resize' ? 'active' : ''}
            onClick={() => {
              setMode('image');
              setImageTool('resize');
            }}
          >
            Redimensionar Imagem
          </button>
          <button
            type="button"
            className={mode === 'image' && imageTool === 'convert' ? 'active' : ''}
            onClick={() => {
              setMode('image');
              setImageTool('convert');
              setImageFormat('jpg');
            }}
          >
            Converter para JPG
          </button>
          <button type="button" className={mode === 'video' ? 'active' : ''} onClick={() => setMode('video')}>
            Vídeo para GIF
          </button>
        </nav>
      </header>

      <section className="hero">
        <h1>Todas as ferramentas necessárias para editar imagens em lote</h1>
        <p>Converta formatos, redimensione largura e altura, ajuste qualidade e gere GIF com tamanho reduzido.</p>
        <div className="mode-tabs">
          <button type="button" className={`pill ${mode === 'image' ? 'active' : ''}`} onClick={() => setMode('image')}>
            Imagem
          </button>
          <button type="button" className={`pill ${mode === 'video' ? 'active' : ''}`} onClick={() => setMode('video')}>
            Vídeo → GIF
          </button>
        </div>
      </section>

      <section className="tools-grid">
        <article
          className={`tool-card ${mode === 'image' && imageTool === 'compress' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setMode('image');
            setImageTool('compress');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              setMode('image');
              setImageTool('compress');
            }
          }}
        >
          <h3>Comprimir IMAGEM</h3>
          <p>Ajuste qualidade e tamanho alvo do arquivo.</p>
        </article>
        <article
          className={`tool-card ${mode === 'image' && imageTool === 'resize' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setMode('image');
            setImageTool('resize');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              setMode('image');
              setImageTool('resize');
            }
          }}
        >
          <h3>Redimensionar IMAGEM</h3>
          <p>Defina largura e altura em menu separado.</p>
        </article>
        <article
          className={`tool-card ${mode === 'image' && imageTool === 'convert' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => {
            setMode('image');
            setImageTool('convert');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              setMode('image');
              setImageTool('convert');
            }
          }}
        >
          <h3>Converter IMAGEM</h3>
          <p>Transforme entre PNG, JPEG, JPG, WEBP, ICO e SVG.</p>
        </article>
        <article
          className={`tool-card ${mode === 'video' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => setMode('video')}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              setMode('video');
            }
          }}
        >
          <h3>Vídeo para GIF</h3>
          <p>Converta vídeo para GIF com foco em qualidade.</p>
        </article>
      </section>

      <section className="panel">
        {mode === 'image' ? (
          <>
            <div className="subtabs">
              <button type="button" className={`subtab ${imageTool === 'convert' ? 'active' : ''}`} onClick={() => setImageTool('convert')}>
                Converter
              </button>
              <button type="button" className={`subtab ${imageTool === 'resize' ? 'active' : ''}`} onClick={() => setImageTool('resize')}>
                Redimensionar
              </button>
              <button type="button" className={`subtab ${imageTool === 'compress' ? 'active' : ''}`} onClick={() => setImageTool('compress')}>
                Comprimir
              </button>
            </div>

            <form onSubmit={submitImage}>
              <div className="form-grid">
                <div className="field field-full">
                  <label>Arquivo de imagem</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/x-icon"
                    onChange={(event) => setImageFile(event.target.files?.[0] || null)}
                  />
                </div>

                <div className="field">
                  <label>Formato de saída</label>
                  <select value={imageFormat} onChange={(event) => setImageFormat(event.target.value)}>
                    {imageFormats.map((format) => (
                      <option key={format} value={format}>
                        {format.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {imageTool === 'resize' && (
                  <>
                    <div className="field">
                      <label>Largura (px)</label>
                      <input type="number" min="1" value={imageWidth} onChange={(event) => setImageWidth(event.target.value)} />
                    </div>

                    <div className="field">
                      <label>Altura (px)</label>
                      <input type="number" min="1" value={imageHeight} onChange={(event) => setImageHeight(event.target.value)} />
                    </div>
                  </>
                )}

                {imageTool === 'compress' && (
                  <>
                    <div className="field">
                      <label>Qualidade (1-100)</label>
                      <input type="number" min="1" max="100" value={imageQuality} onChange={(event) => setImageQuality(event.target.value)} />
                    </div>

                    <div className="field">
                      <label>Tamanho alvo (KB)</label>
                      <input type="number" min="1" value={imageTargetSize} onChange={(event) => setImageTargetSize(event.target.value)} />
                    </div>
                  </>
                )}
              </div>

              <button className="primary" disabled={loading} type="submit">
                {loading
                  ? 'Processando...'
                  : imageTool === 'convert'
                    ? 'Converter imagem'
                    : imageTool === 'resize'
                      ? 'Redimensionar imagem'
                      : 'Comprimir imagem'}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={submitVideo}>
            <div className="form-grid">
              <div className="field field-full">
                <label>Arquivo de vídeo</label>
                <input
                  type="file"
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo"
                  onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
                />
              </div>

              <div className="field">
                <label>Largura GIF (px)</label>
                <input type="number" min="1" value={gifWidth} onChange={(event) => setGifWidth(event.target.value)} />
              </div>

              <div className="field">
                <label>Altura GIF (px)</label>
                <input type="number" min="1" value={gifHeight} onChange={(event) => setGifHeight(event.target.value)} />
              </div>

              <div className="field">
                <label>FPS (8-30)</label>
                <input type="number" min="8" max="30" value={gifFps} onChange={(event) => setGifFps(event.target.value)} />
              </div>
            </div>

            <button className="primary" disabled={loading} type="submit">
              {loading ? 'Gerando GIF...' : 'Converter vídeo em GIF'}
            </button>
          </form>
        )}

        {status.message && <p className={statusClass}>{status.message}</p>}
      </section>
    </main>
  );
}

export default App;
