export type TipoDocumento = 'DNI' | 'CE' | 'PASAPORTE'

export interface HuespedDTO {
  id?: string
  documento_tipo: TipoDocumento
  documento: string
  apellidos_nombres: string
  nacionalidad: string
  fecha_nacimiento: string | null
  estado_civil: string | null
  distrito: string | null
  direccion: string | null
  actualizado_en?: string
}

export const huespedVacio = (): HuespedDTO => ({
  documento_tipo: 'DNI', documento: '', apellidos_nombres: '', nacionalidad: 'Peruana',
  fecha_nacimiento: null, estado_civil: null, distrito: null, direccion: null,
})

export const ESTADOS_CIVILES = ['Soltero(a)', 'Casado(a)', 'Conviviente', 'Divorciado(a)', 'Viudo(a)']
