// *****************************************************************************
// InformeHtmlService — construye el documento HTML autocontenido que Puppeteer
// convertirá en PDF en el servidor.
//
// Este servicio NO habla con el servidor ni descarga nada: solo devuelve un
// string con un documento HTML completo (con sus propios estilos). Esa
// separación permite construir y revisar la plantilla del informe sin
// necesidad de tener el servidor arrancado.
// *****************************************************************************
import { Injectable } from '@angular/core';
import { Restaurante } from '../interface/restaurante';

// Datos de los filtros activos en el momento de generar el informe.
export interface FiltrosInforme {
  busqueda: string;
  territorios: string[];
  localidades: string[];
}

@Injectable({ providedIn: 'root' })
export class InformeHtmlService {

  // Genera el HTML completo del informe a partir de los restaurantes ya
  // filtrados por HomePage. El método es público porque InformeService lo
  // utiliza como primer paso de la exportación.
  construirHTML(restaurantes: Restaurante[], filtros: FiltrosInforme): string {
    const filas = restaurantes.map(r => `
      <tr>
        <td>${r.documentName ?? ''}</td>
        <td>${r.territory ?? ''}</td>
        <td>${r.locality ?? ''}</td>
        <td>${r.restorationType ?? ''}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; }
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 11px; }
          table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 10px; border: 1px solid #dbe3ee; border-radius: 6px; overflow: hidden; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 9px; text-align: left; vertical-align: top; }
          th { background: #1e3a5f; color: #ffffff; font-size: 9px; letter-spacing: 0.3px; text-transform: uppercase; }
          tbody tr:nth-child(even) { background: #f8fafc; }
          tbody tr:last-child td { border-bottom: 0; }
          tr { break-inside: avoid; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr><th>Nombre</th><th>Territorio</th><th>Localidad</th><th>Tipo</th></tr>
          </thead>
          <tbody>${filas}</tbody>
        </table>
      </body>
      </html>
    `;
  }
}
