'use client';

import { HoloSurface } from './holo';
import { Mark } from './navigation';

export type PieceKind = 'coin' | 'dollar' | 'hash' | 'live' | 'AAPLx' | 'TSLAx' | 'NVDAx' | 'MSFTx';
export function Piece({ kind }: { kind: PieceKind }) {
  const coin = kind === 'coin';
  const label = kind === 'dollar' ? '$' : kind === 'hash' ? '#' : kind === 'live' ? 'LIVE' : kind;
  return <HoloSurface variant="foil" className={`floating-piece floating-piece-${coin ? 'coin' : kind === 'dollar' || kind === 'hash' ? 'tile' : 'badge'}`}>
    <span className="floating-piece-print">{coin ? <Mark /> : label}</span>
  </HoloSurface>;
}
