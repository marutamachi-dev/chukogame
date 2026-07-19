export const updatedAt = "2026年7月18日 06:00";

const verifiedJans = {
  mariokart8dx: "4902370536485",
  splatoon3: "4902370550337",
  "animal-crossing": "4902370545319",
  "pokemon-scarlet": "4902370550542",
  luigi3: "4902370543964",
  smash: "4902370540734",
  kirby: "4902370549454",
};

export const games = [
  { id: "mariokart8dx", jan: "4902370551927", title: "マリオカート８ デラックス", genre: "レース", cover: "MK", purchase: [{ name: "楽天市場", price: 2680, url: "https://search.rakuten.co.jp/search/mall/%E3%83%9E%E3%83%AA%E3%82%AA%E3%82%AB%E3%83%BC%E3%83%888%20%E3%83%87%E3%83%A9%E3%83%83%E3%82%AF%E3%82%B9/" }, { name: "Yahoo!ショッピング", price: 2720, url: "https://shopping.yahoo.co.jp/search?p=%E3%83%9E%E3%83%AA%E3%82%AA%E3%82%AB%E3%83%BC%E3%83%888%20%E3%83%87%E3%83%A9%E3%83%83%E3%82%AF%E3%82%B9" }, { name: "ゲオ", price: 2880, url: "https://ec.geo-online.co.jp/" }], sale: [{ name: "ソフマップ・宅配買取", price: 2100, url: "https://raku-uru.sofmap.com/" }, { name: "ブックオフ", price: 2000, url: "https://www.bookoffonline.co.jp/" }], searches: 12245 },
  { id: "zelda-totk", jan: "4902370550975", title: "ゼルダの伝説 ティアーズ オブ ザ キングダム", genre: "アクション", cover: "ZT", purchase: [{ name: "楽天市場", price: 2980, url: "https://search.rakuten.co.jp/search/mall/%E3%82%BC%E3%83%AB%E3%83%80%E3%81%AE%E4%BC%9D%E8%AA%AC%20%E3%83%86%E3%82%A3%E3%82%A2%E3%83%BC%E3%82%BA%20%E3%82%AA%E3%83%96%20%E3%82%B6%20%E3%82%AD%E3%83%B3%E3%82%B0%E3%83%80%E3%83%A0/" }, { name: "Yahoo!ショッピング", price: 3050, url: "https://shopping.yahoo.co.jp/" }], sale: [{ name: "ソフマップ・宅配買取", price: 2530, url: "https://raku-uru.sofmap.com/" }], searches: 9876 },
  { id: "splatoon3", jan: "4902370549566", title: "スプラトゥーン3", genre: "アクション", cover: "SP", purchase: [{ name: "楽天市場", price: 2780, url: "https://search.rakuten.co.jp/search/mall/%E3%82%B9%E3%83%97%E3%83%A9%E3%83%88%E3%82%A5%E3%83%BC%E3%83%B33/" }, { name: "Yahoo!ショッピング", price: 2900, url: "https://shopping.yahoo.co.jp/" }], sale: [{ name: "ブックオフ", price: 2380, url: "https://www.bookoffonline.co.jp/" }], searches: 8543 },
  { id: "animal-crossing", jan: "4902370545316", title: "あつまれ どうぶつの森", genre: "シミュレーション", cover: "AC", purchase: [{ name: "楽天市場", price: 2380, url: "https://search.rakuten.co.jp/search/mall/%E3%81%82%E3%81%A4%E3%81%BE%E3%82%8C%20%E3%81%A9%E3%81%86%E3%81%B6%E3%81%A4%E3%81%AE%E6%A3%AE/" }], sale: [{ name: "ゲオ", price: 1980, url: "https://ec.geo-online.co.jp/" }], searches: 7654 },
  { id: "pokemon-scarlet", jan: "4902370550555", title: "ポケットモンスター スカーレット", genre: "RPG", cover: "PS", purchase: [{ name: "楽天市場", price: 2980, url: "https://search.rakuten.co.jp/search/mall/%E3%83%9D%E3%82%B1%E3%83%83%E3%83%88%E3%83%A2%E3%83%B3%E3%82%B9%E3%82%BF%E3%83%BC%20%E3%82%B9%E3%82%AB%E3%83%BC%E3%83%AC%E3%83%83%E3%83%88/" }], sale: [{ name: "ソフマップ・宅配買取", price: 2580, url: "https://raku-uru.sofmap.com/" }], searches: 5678 },
  { id: "luigi3", jan: "4902370543961", title: "ルイージマンション3", genre: "アクション", cover: "LM", purchase: [{ name: "楽天市場", price: 2780, url: "https://search.rakuten.co.jp/search/mall/%E3%83%AB%E3%82%A4%E3%83%BC%E3%82%B8%E3%83%9E%E3%83%B3%E3%82%B7%E3%83%A7%E3%83%B33/" }], sale: [{ name: "ゲオ", price: 2180, url: "https://ec.geo-online.co.jp/" }], searches: 4123 },
  { id: "smash", jan: "4902370540731", title: "大乱闘スマッシュブラザーズ SPECIAL", genre: "アクション", cover: "SS", purchase: [{ name: "楽天市場", price: 3480, url: "https://search.rakuten.co.jp/search/mall/%E5%A4%A7%E4%B9%B1%E9%97%98%E3%82%B9%E3%83%9E%E3%83%83%E3%82%B7%E3%83%A5%E3%83%96%E3%83%A9%E3%82%B6%E3%83%BC%E3%82%BASPECIAL/" }], sale: [{ name: "ゲオ", price: 2780, url: "https://ec.geo-online.co.jp/" }], searches: 6789 },
  { id: "minecraft", jan: "4549576094113", title: "Minecraft", genre: "アドベンチャー", cover: "MC", purchase: [{ name: "楽天市場", price: 2600, url: "https://search.rakuten.co.jp/search/mall/Minecraft%20Switch/" }], sale: [{ name: "ブックオフ", price: 1850, url: "https://www.bookoffonline.co.jp/" }], searches: 4567 },
  { id: "kirby", jan: "4902370551149", title: "星のカービィ ディスカバリー", genre: "アクション", cover: "KB", purchase: [{ name: "楽天市場", price: 2980, url: "https://search.rakuten.co.jp/search/mall/%E6%98%9F%E3%81%AE%E3%82%AB%E3%83%BC%E3%83%93%E3%82%A3%20%E3%83%87%E3%82%A3%E3%82%B9%E3%82%AB%E3%83%90%E3%83%AA%E3%83%BC/" }], sale: [{ name: "ソフマップ・宅配買取", price: 2480, url: "https://raku-uru.sofmap.com/" }], searches: 3210 },
  { id: "momotetsu", jan: "4988602173400", title: "桃太郎電鉄ワールド", genre: "パーティー", cover: "MT", purchase: [{ name: "楽天市場", price: 3200, url: "https://search.rakuten.co.jp/search/mall/%E6%A1%83%E5%A4%AA%E9%83%8E%E9%9B%BB%E9%89%84%E3%83%AF%E3%83%BC%E3%83%AB%E3%83%89/" }], sale: [{ name: "ゲオ", price: 2400, url: "https://ec.geo-online.co.jp/" }], searches: 3456 },
];

for (const game of games) {
  if (verifiedJans[game.id]) game.jan = verifiedJans[game.id];
}

export const yen = (value) => `${value.toLocaleString("ja-JP")}円`;
export const cheapestBuy = (game) => Math.min(...game.purchase.map((item) => item.price));
export const highestSale = (game) => game.sale?.length ? Math.max(...game.sale.map((item) => item.price)) : null;
export const playCost = (game) => {
  const sale = highestSale(game);
  return sale == null ? null : cheapestBuy(game) - sale;
};
