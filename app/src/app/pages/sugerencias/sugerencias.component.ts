// app/src/app/pages/sugerencias/sugerencias.component.ts
import { Component, OnInit } from '@angular/core';
import { SugerenciasService, Sugerencia } from '../../services/sugerencias.service';

@Component({
  selector: 'app-sugerencias',
  templateUrl: './sugerencias.component.html',
})
export class SugerenciasComponent implements OnInit {
  term = '';
  lista: Sugerencia[] = [];
  creando = { titulo: '', descripcion: '' };
  cargando = false;
  error = '';

  constructor(private api: SugerenciasService) {}

  ngOnInit() { this.buscar(); }

  buscar() {
    this.cargando = true;
    this.api.listar(this.term).subscribe({
      next: r => { this.lista = r; this.cargando = false; },
      error: _ => { this.error = 'No se pudo cargar'; this.cargando = false; }
    });
  }

  crear() {
    if (!this.creando.titulo || !this.creando.descripcion) return;
    this.api.crear({ ...this.creando, creadoPor: 'web' }).subscribe({
      next: _ => { this.creando = { titulo: '', descripcion: '' }; this.buscar(); },
      error: _ => { this.error = 'No se pudo crear'; }
    });
  }

  marcarResuelta(item: Sugerencia) {
    this.api.actualizarEstado(item.id, 'RESUELTA', item.utilidad ?? 0).subscribe({
      next: _ => this.buscar()
    });
  }
}
