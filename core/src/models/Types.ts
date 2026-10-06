// core/src/models/Types.ts
export type CardType = 
  | 'Defuse' 
  | 'ExplodingKitten' 
  | 'Attack' 
  | 'Favor' 
  | 'Nope' 
  | 'Shuffle' 
  | 'Skip' 
  | 'SeeTheFuture' 
  | 'CatCard'; // Represents generic cat cards (TacoCat, etc.)

export interface Card {
  id: string; // Unique UUID to track specific cards, needed for effects that require specific card instances
  type: CardType | string; // Allows expansion string types
  name: string;
}

export interface Player {
  id: string;
  hand: Card[];
  hasExploded: boolean;
}