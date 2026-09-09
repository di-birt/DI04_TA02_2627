// *****************************************************************************
// SERVIDOR — Express (TypeScript)
//
// npm start ejecuta este archivo mediante tsx.
// *****************************************************************************
import cors from 'cors';
import express, { type Request, type Response } from 'express';
import puppeteer from 'puppeteer';

// Express recibe las peticiones HTTP y registra las rutas disponibles en esta
// aplicación. Todas las configuraciones que se añaden con `app.use` se aplican
// antes de que la petición llegue a las rutas.
const app = express();

// Convierte cuerpos JSON en objetos JavaScript accesibles mediante `req.body`.
// Se amplía el límite por defecto porque el HTML del informe (con la tabla
// completa de restaurantes) puede superar el 1mb habitual de Express.
app.use(express.json({ limit: '10mb' }));

// Permite que la aplicación Ionic, ejecutándose normalmente en otro puerto
// durante el desarrollo, pueda llamar a este servidor. Sin CORS el navegador
// bloquearía esa petición por pertenecer a un origen distinto.
app.use(cors());

// Inicia Chromium una sola vez y reutiliza la misma instancia para cada
// informe, abriendo una pestaña nueva por petición.
const browserPromise = puppeteer.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

// *****************************************************************************
// RUTA DE PRUEBA — pensada para el primer contacto con este servidor.
//
// Solo recibe un JSON sencillo y responde con otro JSON. Sirve para comprobar
// que la app Angular y este servidor pueden comunicarse.
// *****************************************************************************
app.post('/api/eco', (req: Request<unknown, unknown, { mensaje?: string }>, res: Response) => {
  const { mensaje } = req.body;

  if (!mensaje) {
    return res.status(400).json({ error: 'Falta el campo "mensaje" en el cuerpo de la petición.' });
  }

  // Devuelve el mensaje recibido junto con la hora del servidor, para que se
  // note claramente que la respuesta viene del backend y no de Angular.
  res.json({
    mensaje: `El servidor ha recibido tu mensaje: "${mensaje}"`,
    recibidoEn: new Date().toISOString(),
  });
});

// *****************************************************************************
// RUTA DE INFORME — recibe el HTML ya construido por Angular y devuelve un PDF.
//
// A diferencia de /api/eco, esta ruta no construye el documento: solo lo
// imprime. La responsabilidad de generar el HTML (tabla, filtros, estilos)
// es de InformeHtmlService, en el frontend.
// *****************************************************************************
interface InformeRequestBody {
  html?: string;
}

app.post('/api/informe', async (req: Request<unknown, unknown, InformeRequestBody>, res: Response) => {
  const { html } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'Falta el campo "html" en el cuerpo de la petición.' });
  }

  let page: Awaited<ReturnType<Awaited<typeof browserPromise>['newPage']>> | undefined;

  try {
    const browser = await browserPromise;
    page = await browser.newPage();

    // El HTML ya llega completo (con su propio <style>), así que basta con
    // esperar a que la pestaña termine de cargarlo.
    await page.setContent(html, { waitUntil: 'load' });

    const pdfData = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '15mm', bottom: '15mm', left: '12mm', right: '12mm' },
    });

    res.type('application/pdf').send(Buffer.from(pdfData));
  } catch (error: unknown) {
    console.error('Error generando el PDF:', error);
    res.status(500).json({ error: 'No se pudo generar el informe.' });
  } finally {
    await page?.close();
  }
});

// Permite configurar el puerto mediante la variable de entorno `PORT`; cuando
// no existe, el servidor usa 3000 para que la aplicación sepa dónde conectarse.
const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});

// Al detener el proceso con Ctrl+C, cierra Chromium antes de finalizar Node.
process.on('SIGINT', async () => {
  const browser = await browserPromise;
  await browser.close();
  process.exit(0);
});