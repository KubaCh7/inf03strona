import { APP_STYLES, EDITOR_THEMES } from '../lib/themes';
import type { AvatarLook } from '../components/Avatar';

export type Slot = keyof AvatarLook | 'editorTheme' | 'appStyle' | 'frame' | 'title' | 'effect';
export type ShopItem = { id: string; slot: Slot; value: string; name: string; price: number; desc?: string };

const av = (slot: keyof AvatarLook, list: [string, string, number][]): ShopItem[] => list.map(([value, name, price]) => ({ id: `${slot}:${value}`, slot, value, name, price }));

export const SHOP: ShopItem[] = [
  ...EDITOR_THEMES.map((t) => ({ id: `editorTheme:${t.id}`, slot: 'editorTheme' as Slot, value: t.id, name: t.name, price: t.price, desc: t.author })),
  ...APP_STYLES.map((s) => ({ id: `appStyle:${s.id}`, slot: 'appStyle' as Slot, value: s.id, name: s.name, price: s.price })),
  ...av('skin', [['s1', 'Jasna', 0], ['s2', 'Średnia', 0], ['s3', 'Oliwkowa', 0], ['s4', 'Ciemna', 0], ['s5', 'Bardzo ciemna', 0]]),
  ...av('hair', [['short', 'Krótkie', 0], ['long', 'Długie', 0], ['ponytail', 'Kucyk', 0], ['curly', 'Loki', 30], ['bun', 'Kok', 30], ['mohawk', 'Irokez', 50]]),
  ...av('hairColor', [['brown', 'Brązowe', 0], ['black', 'Czarne', 0], ['blond', 'Blond', 0], ['red', 'Rude', 0], ['gray', 'Siwe', 20], ['pink', 'Różowe', 40], ['blue', 'Niebieskie', 40], ['green', 'Zielone', 40], ['purple', 'Fioletowe', 40]]),
  ...av('top', [['tee', 'Koszulka', 0], ['hoodie', 'Bluza z kapturem', 40], ['shirt', 'Koszula', 40], ['sweater', 'Sweter <h1>', 60], ['suit', 'Garnitur egzaminacyjny', 120]]),
  ...av('topColor', [['accent', 'Kolor motywu', 0], ['ink', 'Grafit', 0], ['white', 'Biały', 0], ['navy', 'Granat', 20], ['green', 'Zieleń', 20], ['yellow', 'Żółty', 20], ['pink', 'Róż', 30], ['neon', 'Neon', 60]]),
  ...av('hat', [['none', 'Bez nakrycia', 0], ['cap', 'Czapka z daszkiem', 40], ['beanie', 'Czapka zimowa', 40], ['headphones', 'Słuchawki', 60], ['party', 'Czapeczka imprezowa', 50], ['grad', 'Biret absolwenta', 200]]),
  ...av('glasses', [['none', 'Bez okularów', 0], ['nerd', 'Okulary', 30], ['sun', 'Przeciwsłoneczne', 50], ['pixel', 'Pikselowe „deal with it”', 90], ['vr', 'Gogle VR', 120]]),
  ...av('accessory', [['none', 'Nic', 0], ['coffee', 'Kubek kawy', 30], ['duck', 'Kaczuszka do debugowania', 60], ['laptop', 'Laptop', 80], ['cat', 'Kot', 100], ['trophy', 'Puchar', 250]]),
  ...av('bg', [['soft', 'Kolor motywu', 0], ['grid', 'Kratka zeszytu', 0], ['code', 'Kod', 40], ['sunset', 'Zachód słońca', 50], ['matrix', 'Matrix', 80], ['space', 'Kosmos', 100]]),
  // ramki awatara
  { id: 'frame:none', slot: 'frame', value: 'none', name: 'Bez ramki', price: 0 },
  { id: 'frame:accent', slot: 'frame', value: '0 0 0 3px var(--accent)', name: 'Ramka w kolorze motywu', price: 30 },
  { id: 'frame:rainbow', slot: 'frame', value: '0 0 0 3px #f43f5e, 0 0 0 6px #f59e0b, 0 0 0 9px #22c55e', name: 'Tęczowa ramka', price: 120 },
  { id: 'frame:neon', slot: 'frame', value: '0 0 0 2px #22d3ee, 0 0 18px #22d3ee', name: 'Neonowa poświata', price: 150 },
  // tytuly pod nickiem
  { id: 'title:none', slot: 'title', value: '', name: 'Bez tytułu', price: 0 },
  { id: 'title:tag', slot: 'title', value: 'Pogromca znaczników', name: 'Pogromca znaczników', price: 40 },
  { id: 'title:join', slot: 'title', value: 'Mistrz JOIN-ów', name: 'Mistrz JOIN-ów', price: 60 },
  { id: 'title:css', slot: 'title', value: 'Czarodziej CSS', name: 'Czarodziej CSS', price: 60 },
  { id: 'title:php', slot: 'title', value: 'Zaklinacz mysqli', name: 'Zaklinacz mysqli', price: 60 },
  { id: 'title:bug', slot: 'title', value: 'Łowca bugów', name: 'Łowca bugów', price: 80 },
  { id: 'title:100', slot: 'title', value: 'Zdam na 100%', name: 'Zdam na 100%', price: 150 },
  // efekty przy dobrej odpowiedzi
  { id: 'effect:none', slot: 'effect', value: 'none', name: 'Bez efektu', price: 0 },
  { id: 'effect:confetti', slot: 'effect', value: 'confetti', name: 'Konfetti przy dobrej odpowiedzi', price: 80 },
  { id: 'effect:stars', slot: 'effect', value: 'stars', name: 'Gwiazdki przy dobrej odpowiedzi', price: 80 },
  { id: 'effect:code', slot: 'effect', value: 'code', name: 'Deszcz </> przy dobrej odpowiedzi', price: 100 },
];

export const FREE_ITEMS = SHOP.filter((i) => i.price === 0).map((i) => i.id);
