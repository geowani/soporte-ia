import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface Sugerencia {
  id: number;
  numeroCaso: string;
  agenteId: number;
  estado: string;
  notas: string;
  creadoEn: string;
}

@Injectable({ providedIn: 'root' })
export class SugerenciasService {
  private base = '/api/sugerencias';

  constructor(private http: HttpClient) {}

  listar(term = '', top = 20) {
    const params = { term, top };
    return this.http.get<Sugerencia[]>(this.base, { params });
  }

  crear(payload: { numeroCaso: string; agenteId: number; notas?: string }) {
    return this.http.post<{ id: number }>(this.base, payload);
  }

  actualizarEstado(id: number, estado: string, notas?: string) {
    return this.http.patch<void>(`${this.base}/${id}/estado`, { estado, notas });
  }
}
