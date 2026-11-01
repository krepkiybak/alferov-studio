// Единственное место для изменения цен, размеров и описаний каталога.
export const studio = {
  name: 'ALFEROV ART STUDIO',
  telegram: 'ig_alferov',
  currency: 'RUB',
  maxQuantity: 99,
  sizes: ['S', 'M', 'L', 'XL', 'XXL'],
};

export const products = [
  {
    id: 'milk-express',
    name: 'Хогвартс-экспресс',
    color: 'Молочный',
    colorHex: '#e7ddcd',
    price: 1990,
    image: 'assets/milk-express.webp',
    detailPosition: '50% 40%',
    detailScale: 2.35,
    tag: 'Маленькое путешествие',
    description: 'Тёплый молочный оттенок и акварельный поезд, который увозит в любимую историю. Для тех, у кого немного волшебства всегда с собой.',
  },
  {
    id: 'black-express',
    name: 'Зимний экспресс',
    color: 'Чёрный',
    colorHex: '#292927',
    price: 1990,
    image: 'assets/black-express.webp',
    detailPosition: '50% 40%',
    detailScale: 2.35,
    tag: 'В ожидании волшебства',
    description: 'Красный поезд, огни в окнах и снежные детали на глубоком чёрном фоне. Маленькое напоминание о том, как приятно ждать чуда.',
  },
  {
    id: 'leviosa',
    name: 'Вингардиум Левиоса',
    color: 'Чёрный',
    colorHex: '#292927',
    price: 1990,
    image: 'assets/leviosa.webp',
    detailPosition: '50% 32%',
    detailScale: 2.1,
    tag: 'Немного легче обычного',
    description: 'Лёгкое акварельное перо и знакомое заклинание. Сдержанный принт с особенным смыслом для тех, кто узнаёт его с первого взгляда.',
  },
];

export const formatPrice = (value) => new Intl.NumberFormat('ru-RU', {
  style: 'currency', currency: studio.currency, maximumFractionDigits: 0,
}).format(value);
