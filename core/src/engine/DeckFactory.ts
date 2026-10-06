// core/src/engine/DeckFactory.ts
import { Card, CardType } from '../models/Types';
import { v4 as uuidv4 } from 'uuid';

export class DeckFactory {
  // Creates the base deck of cards, exluding Defuse and Exploding Kitten cards
  public createBaseDeck(): Card[] {
    const deck: Card[] = [];

    const addCards = (type: CardType, count: number, name: string) => {
      for (let i = 0; i < count; i++) {
        deck.push({ id: uuidv4(), type, name });
      }
    };

    addCards('Attack', 4, 'Attack');
    addCards('Favor', 4, 'Favor');
    addCards('Nope', 5, 'Nope');
    addCards('Shuffle', 4, 'Shuffle');
    addCards('Skip', 4, 'Skip');
    addCards('SeeTheFuture', 5, 'See The Future');
    addCards('CatCard', 4, 'Hairy Potato Cat');
    addCards('CatCard', 4, 'Cattermelon');
    addCards('CatCard', 4, 'Rainbow-Ralphing Cat');
    addCards('CatCard', 4, 'Tacocat');
    addCards('CatCard', 4, 'Overweight Bikini Cat');

    return deck;
  }

  // Create the specific number of Defuse cards
  public createDefuseCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push({ id: uuidv4(), type: 'Defuse', name: 'Defuse' });
    }
    return cards;
  }

  // Create the specific number of Exploding Kitten cards
  public createExplodingKittens(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
      cards.push({ id: uuidv4(), type: 'ExplodingKitten', name: 'Exploding Kitten' });
    }
    return cards;
  }
}