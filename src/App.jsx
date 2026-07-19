import { useEffect, useState } from "react";
import { ArrowRight, Copy, ExternalLink, Gamepad2, Heart, Menu, Search, Share2, ShoppingBag, Store, Tag, Trophy } from "lucide-react";
import { cheapestBuy, games, highestSale, playCost, updatedAt, yen } from "./data/catalog.js";
import { matchesTitle } from "./lib/game-match.js";

const genres = ["アクション", "RPG", "アドベンチャー", "シミュレーション", "パーティー", "スポーツ", "レース", "パズル", "ホラー", "その他"];
const rankedGames = () => [...games].filter((game) => playCost(game) !== null).sort((a, b) => playCost(a) - playCost(b));
const packageImageUrls = {
  mariokart8dx: "/package-images/mariokart8dx.png",
  "zelda-totk": "/package-images/zelda-totk.jpg",
  splatoon3: "/package-images/splatoon3.png",
  "animal-crossing": "/package-images/animal-crossing.png",
  "pokemon-scarlet": "/package-images/pokemon-scarlet.png",
  luigi3: "/package-images/luigi3.png",
  smash: "/package-images/smash.jpg",
  minecraft: "/package-images/minecraft.jpg",
  kirby: "/package-images/kirby.png",
  momotetsu: "/package-images/momotetsu.jpg",
};
function Cover({ game, large = false }) {
  const fallback = `/covers/${game.id}.svg`;
  const [src, setSrc] = useState(packageImageUrls[game.id] || game.imageUrl || fallback);

  return <div className={`cover cover-${game.cover} ${large ? "cover-large" : ""}`}><img src={src} alt={`${game.title} パッケージ画像`} onError={() => setSrc(fallback)} /></div>;
}

function Header({ onSearch, onNavigate }) {
  return <header className="site-header"><div className="header-inner">
    <button className="brand" onClick={() => onNavigate("home")}><span className="brand-icon"><ShoppingBag size={19}/></span><span>中古ゲーム<span>価格ナビ</span></span></button>
    
    <nav><button onClick={() => onNavigate("ranking-page")}><Trophy size={15}/>ランキング</button><button onClick={() => onNavigate("genre-page")}><Gamepad2 size={15}/>ジャンル</button></nav><button className="menu-button" title="メニュー"><Menu/></button>
  </div></header>;
}
function Hero({ onPrices, onRanking }) {
  const heroGames = [
    { src: "/package-images/zelda-totk.jpg", alt: "ゼルダの伝説 ティアーズ オブ ザ キングダム" },
    { src: "/package-images/pokemon-scarlet.png", alt: "ポケットモンスター スカーレット" },
    { src: "/package-images/momotetsu.jpg", alt: "桃太郎電鉄ワールド" },
  ];

  return <section className="hero"><div className="hero-inner"><div className="hero-copy"><p>Switch中古ソフトを</p><h1><span>安く</span>買いたい<br/><span>高く</span>売りたい</h1><div className="hero-actions"><button onClick={onPrices}><Search size={22}/>ゲーム名で価格を調べる</button><button onClick={onRanking}><Tag size={21}/>安く遊べるゲームを探す</button></div></div><div className="hero-packages">{heroGames.map((game, index) => <figure className={`hero-package hero-package-${index + 1}`} key={game.src}><img src={game.src} alt={game.alt}/></figure>)}</div></div></section>;
}
function Formula({ game = games[0] }) { const buy = cheapestBuy(game), sell = highestSale(game); return <section className="formula"><div><h2>実質プレイ費用とは？</h2><p>買う目安から売る目安を差し引いた実質的な出費です。</p></div><div className="formula-items"><span className="formula-buy"><ShoppingBag size={20}/>買う目安 <b>{yen(buy)}</b></span><b className="operator">-</b><span className="formula-sale"><Store size={20}/>売る目安 <b>{sell ? yen(sell) : "-"}</b></span><b className="operator">=</b><span className="formula-result">実質プレイ費用 <b>{sell ? yen(buy - sell) : "算出できません"}</b></span></div></section>; }
function PriceTable({ onSearch }) { const [query, setQuery] = useState(""); return <section id="prices" className="content-section price-section"><div className="section-heading"><div><span className="red-bar"/><h2>ゲームの価格を調べる</h2></div></div><form className="price-search" onSubmit={(event) => { event.preventDefault(); onSearch(query); }}><Search size={20}/><input type="search" name="title" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ゲーム名で検索" autoComplete="off" aria-label="ゲーム名で検索"/><button>検索</button></form><div className="price-update">最終更新: {updatedAt}</div><div className="table-wrap"><table><thead><tr><th rowSpan="2">ゲーム名</th><th colSpan="2" className="buy-head">買う目安</th><th colSpan="2" className="sale-head">売る目安</th><th rowSpan="2" className="cost-head">実質プレイ費用</th></tr><tr><th>店舗・EC</th><th>ネットオークション</th><th>店舗買取</th><th>ネットオークション</th></tr></thead><tbody>{games.slice(0, 5).map((game) => <tr key={game.id} className="price-row" role="link" tabIndex={0} aria-label={`${game.title}の詳細を見る`} onClick={() => onSearch(game.title)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSearch(game.title); } }}><td><span className="table-game"><img src={packageImageUrls[game.id] || game.imageUrl || `/covers/${game.id}.svg`} alt=""/><span>{game.title}</span><span className="table-detail">詳細を見る <ArrowRight size={15}/></span></span></td><td>{yen(cheapestBuy(game))}</td><td className="auction">参照できる情報がありません</td><td className="sale-value">{highestSale(game) ? yen(highestSale(game)) : "-"}</td><td className="auction">参照できる情報がありません</td><td className="cost-value">{playCost(game) === null ? "算出できません" : yen(playCost(game))}</td></tr>)}</tbody></table></div><p className="data-note">価格は通常中古・動作品・付属品条件が大きく欠けない商品の参考値です。</p></section>; }
function Ranking({ onOpen, onNavigate }) { return <section id="ranking" className="content-section ranking-section"><div className="section-heading"><div><span className="red-bar"/><h2>ランキング</h2></div><button className="text-link" onClick={() => onNavigate("ranking-page")}>ランキングを見る <ArrowRight size={16}/></button></div><article className="ranking-panel"><h3><Trophy size={22}/>実質プレイ費用が安いSwitchソフト</h3><div className="ranking-grid">{rankedGames().slice(0, 10).map((game, index) => <button className="ranking-item" key={game.id} onClick={() => onOpen(game)}><span className={`rank rank-${index + 1}`}>{index + 1}</span><Cover game={game}/><span className="ranking-title">{game.title}</span><strong>{yen(playCost(game))}</strong><span className="ranking-open">詳細を見る <ArrowRight size={14}/></span></button>)}</div></article></section>; }
function GenreNav({ onNavigate }) { return <section id="genres" className="content-section genre-section"><div className="section-heading"><div><span className="red-bar"/><h2>ジャンルから探す</h2></div><button className="text-link" onClick={() => onNavigate("genre-page")}>ジャンル一覧を見る <ArrowRight size={16}/></button></div><div className="home-genre-cta"><div><h3>遊びたい気分から、価格を比較するゲームを見つける</h3><p>アクション、RPG、レースなどから、気になる一本を探せます。</p></div><button onClick={() => onNavigate("genre-page")}>ジャンル一覧を見る <ArrowRight size={17}/></button></div></section>; }
function ShareBar() { const [copied, setCopied] = useState(false); const share = async () => { if (navigator.share) await navigator.share({ title: "中古ゲーム価格ナビ", url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); } }; return <section className="share"><span>このページをシェアする</span><button className="share-main" onClick={share}><Share2 size={18}/>共有</button><button className="share-x" onClick={share}>X</button><button className="share-fb" onClick={share}>f</button><button className="share-line" onClick={share}>LINE</button><button className="share-copy" onClick={share} title="URLをコピー"><Copy size={17}/></button>{copied && <small>URLをコピーしました</small>}</section>; }
function CompareCard({ kind, rows }) { const buying = kind === "buy"; return <article className={`compare-card ${kind}`}><h2>{buying ? "買う先を比較する" : "売る先を比較する"}</h2>{rows.length ? rows.map((row, index) => <div className="compare-row" key={row.name}><div><strong>{row.name}</strong>{index === 0 && <em>{buying ? "最安" : "最高"}</em>}</div><b>{yen(row.price)}</b><a href={row.url} target="_blank" rel="noreferrer">{buying ? "買う" : "売る"}<ExternalLink size={15}/></a></div>) : <div className="empty-state">参照できる情報がありません</div>}<p>{buying ? "在庫がある通常中古品のみを表示しています。" : "参考買取価格です。店頭・宅配で高い方を表示します。"}</p></article>; }
function Detail({ game, onBack, onOpen }) { const cost = playCost(game); return <main><div className="breadcrumb"><button onClick={onBack}>← ホームへ戻る</button></div><section className="detail-hero"><Cover game={game} large/><div><p className="eyebrow">Nintendo Switch / 国内パッケージ版</p><h1>{game.title}</h1><p className="detail-meta">JAN: {game.jan}　ジャンル: {game.genre}　通常中古品を比較</p></div><button className="favorite" title="お気に入り"><Heart size={21}/></button><div className="cost-banner"><span>実質プレイ費用の目安</span><strong>{cost === null ? "算出できません" : yen(cost)}</strong><small>{cost === null ? "売値データを確認できません" : `最安買値 ${yen(cheapestBuy(game))} - 最高売値 ${yen(highestSale(game))}`}</small></div></section><section className="compare-grid"><CompareCard kind="buy" rows={[...game.purchase].sort((a,b) => a.price-b.price)}/><CompareCard kind="sell" rows={[...(game.sale || [])].sort((a,b) => b.price-a.price)}/></section><Formula game={game}/><section className="related"><h2>よく一緒に見られるソフト</h2>{games.filter((item) => item.id !== game.id).slice(0, 3).map((item) => <button key={item.id} onClick={() => onOpen(item)}><Cover game={item}/><span>{item.title}</span><span>価格を見る <ArrowRight size={16}/></span></button>)}</section><ShareBar/></main>; }
function Result({ query, onOpen, onBack }) { const results = games.filter((game) => matchesTitle(game, query) || game.genre === query); return <main className="simple-page"><button className="back" onClick={onBack}>← ホームへ戻る</button><h1>「{query}」の検索結果</h1>{results.length ? <div className="results">{results.map((game) => <button key={game.id} onClick={() => onOpen(game)}><Cover game={game}/><div><strong>{game.title}</strong><span>最安 {yen(cheapestBuy(game))} / 実質プレイ費用 {playCost(game) === null ? "算出できません" : yen(playCost(game))}</span></div><ArrowRight/></button>)}</div> : <p>該当するゲームが見つかりませんでした。</p>}</main>; }
function DirectoryPage({ kind, onOpen, onBack, onGenre }) {
  if (kind === "ranking") return <main className="directory-page"><button className="back" onClick={onBack}>← ホームへ戻る</button><p className="directory-kicker">Nintendo Switch / 国内パッケージ版</p><h1>実質プレイ費用ランキング</h1><p className="directory-description">買う目安から売る目安を差し引いた、実質的な出費が少ない中古Switchソフトを紹介します。</p><div className="directory-update">最終更新: {updatedAt}</div><div className="directory-list">{rankedGames().slice(0, 50).map((game, index) => <button key={game.id} onClick={() => onOpen(game)}><span className={`rank rank-${index + 1}`}>{index + 1}</span><Cover game={game}/><span><strong>{game.title}</strong><small>{game.genre} / 国内パッケージ版</small></span><b>{yen(playCost(game))}</b><span className="directory-open">詳細を見る <ArrowRight size={15}/></span></button>)}</div></main>;
  if (kind === "genre") return <main className="directory-page"><button className="back" onClick={onBack}>← ホームへ戻る</button><p className="directory-kicker">Nintendo Switch</p><h1>ジャンルから探す</h1><p className="directory-description">遊びたい気分から、中古価格を比較するゲームを見つけられます。</p><div className="directory-genres">{genres.map((genre) => <button key={genre} onClick={() => onGenre(genre)}><Gamepad2 size={20}/>{genre}<ArrowRight size={16}/></button>)}</div><section className="genre-directory-cta"><div><p>はじめての比較に</p><h2>安く遊べるゲームから探す</h2><span>実質プレイ費用が少ないソフトのランキングから、気になる一本を見つけられます。</span></div><button onClick={() => window.location.assign("/ranking")}>ランキングを見る <ArrowRight size={17}/></button></section></main>;
  return <main className="directory-page guide-page"><button className="back" onClick={onBack}>← ホームへ戻る</button><p className="directory-kicker">使い方ガイド</p><h1>中古ゲーム価格ナビの使い方</h1><ol><li>ゲーム名で検索します。</li><li>買う目安と売る目安の価格を比較します。</li><li>実質プレイ費用の目安を確認します。</li></ol><p>価格は通常中古・動作品の参考値です。実際の在庫や買取価格は各リンク先で確認してください。</p></main>;
}
function readLocation() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/ranking") return { page: "ranking" };
  if (path === "/genres") return { page: "genres" };
  if (path === "/guide") return { page: "guide" };
  if (path.startsWith("/games/")) return { page: "detail", gameId: decodeURIComponent(path.slice("/games/".length)) };
  if (path === "/search") return { page: "search", query: new URLSearchParams(window.location.search).get("q") || "" };
  return { page: "home" };
}

export function App() {
  const [location, setLocation] = useState(readLocation);
  const currentGame = games.find((game) => game.id === location.gameId) || games[0];

  useEffect(() => {
    const handlePopState = () => setLocation(readLocation());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    const title = location.page === "detail" ? `${currentGame.title}の中古価格比較 | 中古ゲーム価格ナビ` : location.page === "ranking" ? "実質プレイ費用ランキング | 中古ゲーム価格ナビ" : location.page === "genres" ? "ジャンルから探す | 中古ゲーム価格ナビ" : "中古ゲーム価格ナビ";
    document.title = title;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);
  }, [location, currentGame]);

  const go = (path, { replace = false } = {}) => {
    if (window.location.pathname + window.location.search !== path) {
      window.history[replace ? "replaceState" : "pushState"]({}, "", path);
    }
    setLocation(readLocation());
    window.scrollTo(0, 0);
  };

  const open = (game) => go(`/games/${encodeURIComponent(game.id)}`);
  const navigate = (next) => {
    if (next === "home") go("/");
    else if (next === "ranking-page") go("/ranking");
    else if (next === "genre-page") go("/genres");
    else if (next === "guide") go("/guide");
    else if (next.startsWith("genre:")) go(`/search?q=${encodeURIComponent(next.slice(6))}`);
  };
  const search = (value) => {
    const term = value.trim();
    if (!term) {
      go("/");
      setTimeout(() => document.querySelector("#prices")?.scrollIntoView({ behavior: "smooth" }), 0);
      return;
    }
    const exactGame = games.find((game) => game.title === term);
    if (exactGame) {
      open(exactGame);
      return;
    }
    go(`/search?q=${encodeURIComponent(term)}`);
  };

  if (location.page === "detail") return <><Header onSearch={search} onNavigate={navigate}/><Detail game={currentGame} onBack={() => navigate("home")} onOpen={open}/></>;
  if (location.page === "search") return <><Header onSearch={search} onNavigate={navigate}/><Result query={location.query} onOpen={open} onBack={() => navigate("home")}/></>;
  if (location.page === "ranking") return <><Header onSearch={search} onNavigate={navigate}/><DirectoryPage kind="ranking" onOpen={open} onBack={() => navigate("home")}/></>;
  if (location.page === "genres") return <><Header onSearch={search} onNavigate={navigate}/><DirectoryPage kind="genre" onBack={() => navigate("home")} onGenre={(genre) => navigate(`genre:${genre}`)}/></>;
  if (location.page === "guide") return <><Header onSearch={search} onNavigate={navigate}/><DirectoryPage kind="guide" onBack={() => navigate("home")}/></>;
  return <><Header onSearch={search} onNavigate={navigate}/><main><Hero onPrices={() => document.querySelector("#prices")?.scrollIntoView({ behavior: "smooth" })} onRanking={() => document.querySelector("#ranking")?.scrollIntoView({ behavior: "smooth" })}/><div className="page-shell"><PriceTable onSearch={search}/><Formula/><Ranking onOpen={open} onNavigate={navigate}/><GenreNav onNavigate={navigate}/></div><ShareBar/></main><footer>中古ゲーム価格ナビ　|　価格は参考情報です。最終更新: {updatedAt}</footer></>;
}