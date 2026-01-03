# Copy-Dog AGENTS.md

## 概要
- 現在ブラウザでアクティブなページの、タイトルとURLなどの情報を取得し、クリップボードにコピーするブラウザ拡張。
- 他にも、ページ公開日時・更新日時・著者・OGP画像の取得が可能。(設定UIで設定が可能)
- Firefoxの拡張をベースに、Chrome版も用意。
- 多言語対応 (日本語と英語)


## 機能要件

### 起動トリガー(２種類)
- キーボードショートカット（デフォルト: Alt+C）で実行
- 右クリックメニュー「Copy Dog」から実行

### 実行時の挙動
- 実行された瞬間の、描画されているウェブページのHTMLをスクレイピングし、データを取得する (詳細は後述)
- 設定UIの値を読み取り、出力フォーマットを取得
- 出力フォーマットをならって、最終データを整形
- 整形済データをクリップボードにコピー
- 成功 or 失敗を、通知する

### 設定UI
ブラウザの設定画面から、以下の設定ができる：
- 出力形式
  - ラジオボタンの前に、簡単な説明文章がある。「ページURL($url), タイトル($title), 日付($date), 著者($author), 画像($image) を取得します。取得できない場合は、空文字となります。」
  - デフォルトがいくつかあり、一番下はカスタムのラベルのラジオボタン
    - タイトルとURL: `$title\n$url`
    - タイトル・日時・URL: `$title ($date)\n$url`
    - タイトルとURL(マークダウン形式): `[$title]($url)`
    - タイトル・日時・URL(マークダウン形式): `[$title]($url) ($date)`
  - その下に、複数行テキスト入力欄 (これはカスタム選択時のみ有効になる)
  - $url, $title, $date, $author, $image という変数が使える
- UIの最後に「保存」ボタン
- デザインはミニマルかつシンプルに


### スクレイピングの詳細
以下に、ページURL、ページタイトル、日時(公開日時・更新日時)・著者・OGP画像について、記載する。
- 取得した値は、出力時 $url, $title, $date, $author, $image でアクセスができる。
- なお、それぞれの要素の抽出は別の関数で行い、エラーは関数内で処理を行い、適切な値を返す。(かつ、ログに出力する)

#### ページURL $url
- `window.location.href` から取得する
- URLにクエリがつく場合があるが、以下のトラッキング系クエリパラメータがあれば、そのパラメータのみ除去する
  - トラッキング系クエリパラメータ
    - utm_source, utm_medium, utm_campaign, utm_term, utm_content
    - fbclid, gclid, gbraid, wbraid, dclid, msclkid, twclid, ttclid, mc_cid, mc_eid
  - 除去した結果、他にパラメータがなければ、残った `?` も除去する
  - イメージ1) `?umt_source=XXX&itemid=1000` → `?itemid=1000`
  - イメージ2) `?umt_source=XXX` → `` ※ `?`も除去
- また、個別対応がある
  - Amazon.co.jpのページの場合、URLを短縮形式に変換
    - 例: `https://www.amazon.co.jp/dp/XXX/` の形式に変換

#### ページタイトル $title
- ページの title タグから取得する

#### 日時 $date
- 公開日時・更新日時をまとめて扱い、以下のロジックで取得する
- はじめに、`<meta property="article:published_time" content="XXX">` の content があれば、それを取得
- 次に、`<script type="application/ld+json">` のタグの中身から、`datePublished` があれば、それを取得
- 続いて、`<time datetime="XXX">` があれば、それを取得
- その次に、`<meta property="article:modified_time" content="XXX">` があれば、それを取得
- 次に、`<meta property="article:modified_time" content="XXX">`
- 次に、`<script type="application/ld+json">` のタグの中身から、`dateModified` があれば、それを取得
取得
- 最後に、`<meta property="og:updated_time" content="XXX">` があれば、それを取得
- 以上を実行し、もしも取得できない場合は、空の文字列 `""` とする
- 取得した日付の値は、さまざまなフォーマットの文字列のため、以下の正規化を行う
  - はじめに、`new Date(dateString)` でパースを行う
  - この時、パースができない場合は、元の `dateString` を返す
  - 最終的に `YYYY/MM/DD HH:mm` の形式で出力する
  - タイムゾーンについては、`dateString` に、`+09:00` や `JST` など、地域のタイムゾーン指定がある場合は、そのタイムゾーンを採用する。しかし、`Z`, `+00:00`, `UTC` など、UTCの場合は、ページ言語を見て、もし日本語であれば JST に変換する (ぺージ言語が日本語ではない場合は、一律UTCとして扱う)。

#### 著者 $author
- 以下のロジックで取得する
- はじめに、`<meta name="author" content="XXX">` があれば、それを取得
- 次に、`<meta name="writer" content="XXX">` があれば、それを取得
- 続いて、`<script type="application/ld+json">` のタグの中身から、`author` があれば、それを取得
- 最後に、`<link rel="author" href="XXX">` があれがそれを取得
- 以上を実行し、もしも取得できない場合は、空の文字列 `""` とする

#### OGP画像 $image
- 以下のロジックで取得する
- はじめに、`<meta property="og:image" content="XXX">` があれば、それを取得
- 次に、`<meta name="twitter:image" content="XXX" />` があれば、それを取得
- 最後に、`<body>` 要素の中に `<img src="XXX">` があれば、最初の値を取得
- 以上を実行し、もしも取得できない場合は、空の文字列 `""` とする
- 取得ができた場合、特別な処理として、絶対パスの場合の対応を行う
  - "//" で始まる場合は、$url で取得したプロトコルとドメインを補完する
    - 例) "//ogp.jpg" → "https://example.com/ogp.jpg"
  - "/" で始まる場合は、$url で取得したドメインを補完する
    - 例) "/ogp.jpg" → "https://example.com/ogp.jpg"
- 取得後の最後の処理として、クエリパラメータが付属する場合があるので、除去する
  - 例) "xxx.jpg?width=600" → "xxx.jpg"


## 非機能要件
### アイコン
かわいらしいワンコのアイコン。
かわいらしく、ページの情報を取って来てくれる、忠実なワンコ。


## セキュリティ要件
- 拡張がアクセスできる権限はなるべく最小とする。



## 開発に関する情報
### フォルダ構成
``` text
copy-dog/
  src/
    common/                 # 両ブラウザ共通（基本はここだけ触る）
      icons/
        icon-48.png
        ...
      content/
        content.js          # DOMから情報抽出 & クリップボードコピー
      background/
        background.js       # commands受けて content に指示、通知
      options/
        options.html
        options.js
        options.css
      _locales/
        ja/messages.json
        en/messages.json

    manifests/              # ブラウザ差分
      chrome/manifest.json
      firefox/manifest.json

  dist/                     
    chrome/                 # Chrome「Load unpacked」対象
    firefox/                # web-ext build で xpi 生成元になるフォルダ

  scripts/
    build.mjs               # common + 各manifest を dist に組み立てる

  package.json              # npm scripts（任意）
  README.md
```

### コード規約
- モダンというより、レガシーなJavaScriptで記述する
- コメントは最低限とするが、可読性を損なわないようにする

### ビルドについて
- 実行コマンド `$ node scripts/build.mjs`
- はじめに必要なファイルを /dist/tmp 配下にコピーをする
- この時、隠しファイル .DS_Store がコピーされる場合があるため、削除する
- この tmp フォルダをzipパッケージングし、/dist フォルダに生成
- 途中の tmp はフォルダごと削除する
