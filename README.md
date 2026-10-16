# Druo 🍿

Sala de cine privada para dos personas:
- **Tu cámara a la izquierda**, **la de ella a la derecha** (con zoom de cara ajustable y sincronizado) y **la pantalla de cine gigante en el centro**.
- **Sincronización bidireccional** entre tu PC y su celular: si cualquiera de los dos pausa, reproduce o adelanta, pasa al instante en el otro dispositivo.
- **Pensado para internet malo**:
  - Voz en **Opus mono con FEC in-band y DTX** (recupera paquetes perdidos y no gasta datos cuando están en silencio mirando la peli) y prioridad de red alta.
  - Escalera de calidad de cámara en vivo (`Auto`, `Solo voz`, `60 kbps`, `140 kbps`, `280 kbps`, `550 kbps`, `HD`) sin cortar la llamada.
  - **Corrección suave de desfase** (ajusta `playbackRate` ±6% antes de pegar un salto brusco) y pausa compartida si a uno se le queda cargando.
  - **Ducking automático**: baja suavemente el volumen de la película cuando alguno habla.
- **Fuentes soportadas**:
  1. **Links directos de MediaFire, Google Drive, Dropbox, YouTube, `.mp4` o `.m3u8` (HLS)** con soporte de adelantar/atrasar (`Range`).
  2. **Biblioteca en la nube (Backblaze B2)** con subida multiparte reanudable (bloques de 10 MB) y soporte de varias calidades por película (`360p` liviana para el celu + `720p` para la PC).
  3. **Modo archivo local (0 consumo de internet)**: cada uno abre el archivo en su dispositivo y Druo sincroniza todo.
  4. **Subtítulos compartidos** `.srt` / `.vtt` con ajuste de desfase (`±0.5s`).

## Uso local

```powershell
cd D:\projetcs\Druo
npm run build
npm start
# -> http://localhost:8787
```

Para convertir cualquier `.mkv` / `.mp4` en dos versiones livianas (`360p` y `720p` con `faststart`):

```powershell
npm run preparar -- "C:\ruta\pelicula.mkv" "Nombre de la peli"
```
