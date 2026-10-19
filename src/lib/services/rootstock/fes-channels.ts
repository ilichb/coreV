/**
 * Canales de origen de las vistas de /preview.
 *
 * El piloto no envía mensajes: el enlace a /preview se publica en varios
 * lugares. Para atribuir la conversión al canal correcto, /preview recibe
 * `?src=<canal>` y lo propaga a check-wallet, que lo persiste junto al evento.
 *
 * IMPORTANTE: los valores de esta lista son parte del contrato publicado
 * (el post semanal reporta el desglose por estos nombres). Cambiarlos sin
 * avisar rompe la continuidad de la serie.
 */

export const FES_CHANNELS = ['rootstock_official', 'forum', 'andromeda', 'direct'] as const;

export type FESChannel = (typeof FES_CHANNELS)[number];

export const CHANNEL_LABELS: Record<FESChannel, string> = {
  rootstock_official: 'Official Rootstock channels',
  forum: 'Forum thread',
  andromeda: 'Andromeda Core channels',
  direct: 'Direct / unknown',
};

/**
 * Dominios que identifican cada canal cuando NO llega `?src=`.
 * Es el fallback de respaldo (refiner → canal) de la figura 6.1 del manual.
 */
const REFERRER_MAP: Array<{ match: string; channel: FESChannel }> = [
  { match: 'rootstockcollective.xyz', channel: 'rootstock_official' },
  { match: 'rootstock.io', channel: 'rootstock_official' },
  { match: 'gov.rootstockcollective.xyz', channel: 'forum' },
  { match: 'andromedacomputer.net', channel: 'andromeda' },
  { match: 'github.com', channel: 'andromeda' },
];

/** Normaliza cualquier valor recibido por query string a un canal válido. */
export function normalizeChannel(raw: unknown): FESChannel {
  const v = String(raw ?? '').trim().toLowerCase();
  return (FES_CHANNELS as readonly string[]).includes(v) ? (v as FESChannel) : 'direct';
}

/**
 * Clasifica el canal a partir de `?src=` y, si no viene, del referrer.
 * Prioridad: ?src= válido → dominio del referrer → direct.
 *
 * `referrer` llega crudo desde `document.referrer` en el cliente. Se manda
 * completo en vez de pre-clasificar en el cliente, para que la lógica de
 * mapeo viva solo acá y no en dos lugares que puedan divergir.
 */
export function resolveChannel(src: unknown, referrer: unknown): FESChannel {
  const raw = String(src ?? '').trim().toLowerCase();
  if ((FES_CHANNELS as readonly string[]).includes(raw)) return raw as FESChannel;

  const r = String(referrer ?? '').toLowerCase();
  if (r) {
    for (const rule of REFERRER_MAP) {
      if (r.includes(rule.match)) return rule.channel;
    }
  }
  return 'direct';
}

/** Desglose de vistas por canal. */
export type ChannelBreakdown = Record<FESChannel, number>;

export function emptyBreakdown(): ChannelBreakdown {
  return { rootstock_official: 0, forum: 0, andromeda: 0, direct: 0 };
}
