export interface CardEntry {
  entry_id: string;
  entry_text: string;
}

export interface Card {
  card_id: string;
  card_name: string;
  card_url: string;
  entries: CardEntry[];
  linkie: string;
  order: string;
  text: string;
  is_horizontal: boolean;
} 