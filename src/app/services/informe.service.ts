// *****************************************************************************
// InformeService — coordina la construcción del HTML, la petición HTTP al
// servidor de informes y la descarga del PDF resultante.
//
// El backend (carpeta /server) es quien ejecuta Puppeteer. Este servicio solo:
//   1. Pide a InformeHtmlService un documento HTML autocontenido.
//   2. Lo envía por POST al backend y recibe el PDF como Blob.
//   3. Crea una descarga en el navegador.
// *****************************************************************************
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Restaurante } from '../interface/restaurante';
import { environment } from '../../environments/environment';
import { InformeHtmlService, type FiltrosInforme } from './informe-html.service';

export type { FiltrosInforme } from './informe-html.service';

@Injectable({ providedIn: 'root' })
export class InformeService {

  private http = inject(HttpClient);
  private informeHtmlService = inject(InformeHtmlService);

  // Coordina una exportación completa. Recibe los restaurantes ya filtrados
  // por HomePage y los filtros activos para mostrarlos en el propio PDF.
  //
  // responseType: 'blob' impide que HttpClient intente interpretar los bytes
  // binarios del PDF como JSON.
  async generarInformePDF(restaurantes: Restaurante[], filtros: FiltrosInforme): Promise<void> {
    const html = this.informeHtmlService.construirHTML(restaurantes, filtros);

    const blob = await firstValueFrom(
      this.http.post(`${environment.informesApiUrl}/api/informe`, { html }, { responseType: 'blob' })
    );

    this.descargarBlob(blob, `informe_restaurantes_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // Crea una URL temporal para iniciar la descarga del PDF recibido. Blob URL
  // permite que un enlace del navegador apunte al contenido binario sin
  // subirlo de nuevo a ningún sitio.
  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revocar demasiado pronto puede producir un archivo corrupto; se espera
    // un instante para dar tiempo al navegador a leerlo.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
