import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { AdminApi, EstadoCorreoAdmin } from '../data-access/admin-api.service';

@Component({
  standalone: true,
  selector: 'app-admin-correo',
  imports: [CommonModule],
  templateUrl: './admin-correo.html'
})
export class AdminCorreoComponent implements OnInit {
  private readonly api = inject(AdminApi);
  estado: EstadoCorreoAdmin | null = null;
  cargando = false;
  probando = false;
  error = '';
  mensaje = '';

  ngOnInit(): void { void this.actualizar(); }

  async actualizar(): Promise<void> {
    this.cargando = true;
    this.error = '';
    try {
      this.estado = await this.api.estadoCorreo();
    } catch {
      this.estado = null;
      this.error = 'No fue posible consultar el correo del servidor. Verifica que Spring Boot esté ejecutándose con la última versión.';
    } finally { this.cargando = false; }
  }

  async enviarPrueba(): Promise<void> {
    if (!this.estado?.configurado || this.probando) return;
    this.probando = true;
    this.error = '';
    this.mensaje = '';
    try {
      const resultado = await this.api.probarCorreo();
      this.mensaje = resultado.mensaje;
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        this.error = e.error?.detail || e.error?.message ||
          e.error?.error || 'No se pudo enviar la prueba. Revisa los registros de Spring Boot y el panel de Resend.';
      } else {
        this.error = 'No se pudo enviar la prueba. Verifica la conexión con el servidor.';
      }
    } finally { this.probando = false; }
  }
}
