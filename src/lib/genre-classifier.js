export const GENRES = Object.freeze([
  "アクション",
  "RPG",
  "アドベンチャー",
  "シミュレーション",
  "スポーツ",
  "レース",
  "パズル",
  "パーティー",
  "音楽・リズム",
  "格闘",
  "シューティング",
  "テーブル・学習",
  "その他",
]);

export const OTHER_GENRE = "その他";

// Primary genres are deliberately decided in series/title order. This is a
// compact, auditable classifier for the catalog; a no-match stays reviewable.
const rules = [
  [/(ピクミン|Pikmin)/iu, "アドベンチャー"],
  [/(Minecraft|マインクラフト)/iu, "アドベンチャー"],
  [/(大乱闘スマッシュブラザーズ|ポッ拳|ファイターズ|Sparking!|オールスターバトル|ストリートファイター|鉄拳|ギルティギア|MARVEL vs\. CAPCOM|カプコン ファイティング|ARMS|ナルティメット|異種最強王)/iu, "格闘"],
  [/(スプラトゥーン|グラディウス|ダライアス|彩京 SHOOTING|エスプレイド|デススマイルズ|究極タイガー|コットン|ACE COMBAT|エースコンバット|シューティング LIBRARY)/iu, "シューティング"],
  [/(太鼓の達人|初音ミク|リズム天国|プリパラ|リズムパーティ|Fit Boxing)/iu, "音楽・リズム"],
  [/(マリオカート|Need for Speed|ニードフォースピード|WRC|レーサー|Drive Kit)/iu, "レース"],
  [/(Nintendo Switch Sports|スポーツパック|マリオゴルフ|マリオテニス|マリオストライカーズ|パワフルプロ野球|パワプロ|EA SPORTS|eBASEBALL|みんなのGOLF|キャプテン翼|釣りスピリッツ|東京2020|オリンピック|リングフィット)/iu, "スポーツ"],
  [/(世界のアソビ大全|麻雀|将棋|囲碁|オセロ|花札|テーブルゲーム|脳を鍛える|やわらかあたま塾|漢検|英検|タイピング|ゲームプログラミング|蟲神器|藤井聡太|学習コレクション)/iu, "テーブル・学習"],
  [/(ぷよぷよ|テトリス|パズル|スイカゲーム|ボンバーマン|8番出口|オバケイドロ|ギミック!|風のクロノア)/iu, "パズル"],
  [/(マリオパーティ|メイド イン ワリオ|人生ゲーム|すみっコぐらし.*すごろく|モルカーパーティ|エブリバディ 1-2-Switch|ツムツム フェスティバル|オーバークック|Overcooked)/iu, "パーティー"],
  [/(桃太郎電鉄|あつまれ どうぶつの森|牧場物語|ルーンファクトリー|シヴィライゼーション|信長の野望|三國志|太閤立志伝|大戦略|スーパーロボット大戦|SDガンダム ジージェネレーション|フロントミッション|戦場のヴァルキュリア|電車でGO|鉄道にっぽん|トラック.*シミュレーター|ペットショップ|どうぶつ病院|ナース物語|村づくり|おみせっち|メガトン級ムサシ)/iu, "シミュレーション"],
  [/(ポケットモンスター|ポケモン|Pokemon|ドラゴンクエスト|ドラクエ|ファイナルファンタジー|FF |ゼノブレイド|Xenoblade|マリオ&ルイージRPG|スーパーマリオRPG|ペルソナ|ファイアーエムブレム|妖怪ウォッチ|ロマンシング サガ|二ノ国|テイルズ|オクトパストラベラー|FANTASIAN|ライブアライブ|イース|ディスガイア|ルーンファクトリー|バテン・カイトス|タクティクスオウガ|ソフィーのアトリエ|モナーク|トリニティトリガー|モンスターファーム|アンダーテイル|UNDERTALE|ガレリア|HADES|ディアブロ|聖塔神記|バルキュリア|ユニコーンオーバーロード|ホグワーツ|ニーア|ダイの大冒険)/iu, "RPG"],
  [/(逆転裁判|探偵|レイトン|ダンガンロンパ|五等分の花嫁|ときめきメモリアル|薄桜鬼|ピオフィオーレ|終遠のヴィルシュ|ニル・アドミラリ|Collar×Malice|CLOCK ZERO|蛇香のライラ|ビルシャナ戦姫|CharadeManiacs|DIABOLIC LOVERS|ファタモルガーナ|グリザイア|BUSTAFELLOWS|ANONYMOUS;CODE|月姫|ファミコン探偵倶楽部|レインコード|真 流行り神|零 |リトルナイトメア|LITTLE NIGHTMARES|8番のりば|グノーシア|Poppy Playtime|デジモンサヴァイブ)/iu, "アドベンチャー"],
  [/(マリオ|ゼルダ|カービィ|ピクミン|ドンキーコング|ヨッシー|ルイージマンション|ソニック|無双|鬼滅の刃|ONE PIECE|ワンピース|ドラゴンボール|ジョジョ|NARUTO|LEGO|レゴ|Minecraft|マインクラフト|テラリア|ARK|ヒューマン フォール|プリンセスピーチ|ベヨネッタ|ダイイングライト|ガンダムブレイカー|バトルアライアンス|ゾイド|ワニワニ|バンディッツ|ほねほねザウルス|塊魂|大神|ごく普通の鹿|Angry Alligator|スーパーリアル麻雀)/iu, "アクション"],
];

export function classifyGameGenre(title) {
  const normalized = String(title || "").normalize("NFKC");
  return rules.find(([pattern]) => pattern.test(normalized))?.[1] || OTHER_GENRE;
}

export function isSupportedGenre(genre) {
  return GENRES.includes(String(genre || "").trim());
}
