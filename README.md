# SUB ROSA

成人同士が互いの傾向を言葉にし、合意と安心について話すための相性タイプ診断です。4軸・16タイプ・5段階の強度指標から診断し、二人分の結果を点数化せずに照合できます。

## ローカルで開く

ビルドは不要です。リポジトリ直下を静的HTTPサーバで配信し、表示されたURLをブラウザで開いてください。

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

その後、`http://127.0.0.1:4173/` にアクセスします。

## 検証

Node.jsが利用できる環境では、質問構成、16タイプの必須項目、全256通りの相性判定、画像生成パイプラインの必須設定を一括確認できます。

```powershell
node tests/validate.js
```

回答内容と結果は端末内だけで処理されます。年齢確認済みフラグは `sr_age_ok`、直近の結果は `sr_last_result` としてブラウザのlocalStorageに保存されます。

## note詳細版リンクの公開

各タイプのnote詳細版は `data/notes.js` で管理します。初期状態は16タイプすべて `url: ""`、`published: false` のため、サイトには「詳細版は準備中です」と表示され、外部リンクのボタンは出ません。

記事を公開するときは、対象タイプの設定に実際の `https://note.com/` で始まる記事URLを貼り、`published` を `true` に変更します。仮URLや公開前URLは設定しません。

```js
LGRC: { url: "https://note.com/実際の記事URL", published: true }
```

変更後は `node tests/validate.js` を実行してください。16コードの不足、公開済みなのにURLが空、note以外の公開URL、HTTPSでないURLを検出します。非公開へ戻すときは `url: ""`、`published: false` の両方を戻します。

## キャラクター画像の生成

サイト本体は引き続きビルド不要です。画像生成、候補検品、WebP化だけを `tools/` 内のローカルスクリプトで行います。APIキーはプロセス環境変数、またはリポジトリ直下のGit管理外 `.env` から読み、コード、引数、ログ、コミットへ入れません。両方にある場合はプロセス環境変数を優先します。

画像APIはネイティブ透明背景に対応する `gpt-image-1.5` を既定とし、透明PNG・1024×1536で出力します。`gpt-image-2` は現在このAPIで透明背景を受け付けないため、このワークフローでは使用しません。

### 初回設定

後処理用の依存をインストールします。

```powershell
cd tools
npm install
cd ..
```

`.env.example` をコピーし、作成した `.env` の `OPENAI_API_KEY=` の右側へキーを設定します。実キー入り `.env`、生成候補、`tools/node_modules/` は `.gitignore` 対象です。

```powershell
Copy-Item .env.example .env
notepad .env
```

### v2 スペック駆動プロンプト

`tools/character-specs.json` が16タイプの髪、装い、所作・表情、アーチ紋章、背景小景、サムネイル輪郭を定義します。`tools/lib/character-data.mjs` はそこへ4軸の見た目文法と `data/types.js` の `motif.color` を合成します。

共通ブロックに残すのは、確定FGPDに合わせたちび頭身、繊細な線画とにじみ水彩、金のアールヌーヴォーアーチ、薄いセピア小景、透過背景だけです。黒髪、暗い服、同じポーズなどの人物情報は共通化しません。

API送信なしでプロンプトを確認できます。

```powershell
node tools/generate-characters.mjs --all --count 1 --dry-run
```

### v2 パイロット

確定FGPDは既存の `tools/out/FGPD/candidate-1.png` を保持します。甘いFTRD、クールなLGPD、献身的なFGRC、静謐なFTPCを3候補ずつ、既存v1候補とは別の `tools/out/v2/` へ生成します。

```powershell
node tools/generate-characters.mjs --code FTRD,LGPD,FGRC,FTPC --count 3 --output-set v2
node tools/build-character-contact.mjs --source v2
```

`tools/out/contact.html` では確定FGPDと新候補を並べ、通常表示と約25%の遠目表示を切り替えられます。髪・服の外形・重心で識別できるか、`motif.color` が衣装の25〜30%以上を占めるか、紋章・文字・数字・指の破綻がないかを確認します。

まず参照画像なしのImages Generationで振れ幅を確認します。頭身、線、水彩、金枠が確定FGPDから割れた場合だけ、確定FGPDを参照するImages Editを別の `tools/out/v2-edit/` へ作り、元候補を残したまま比較します。

```powershell
node tools/generate-characters.mjs --code FTRD,LGPD,FGRC,FTPC --count 3 --output-set v2-edit --reference tools/out/FGPD/candidate-1.png
node tools/build-character-contact.mjs --source v2,v2-edit
```

この比較表示では、`v2` が人物差を優先した参照なし版、`v2-edit` が画風を確定FGPDへ寄せた参照編集版です。Edit版で黒ボブ、片目隠し、丸い黒コートが戻っていないかも確認します。

### 承認後の残り11タイプ

パイロット承認後、FGPDとパイロット4タイプを除く11タイプを同じ `tools/out/v2/` へ追加します。既定で13秒間隔とリトライを入れ、失敗一覧を `tools/out/v2/failures.json` に残します。

```powershell
node tools/generate-characters.mjs --code LGRC,LGRD,LGPC,LTRC,LTRD,LTPC,LTPD,FGRD,FGPC,FTRC,FTPD --count 3 --output-set v2
node tools/build-character-contact.mjs --source v2
```

参照なし版を採用する場合は上の `v2` コマンドを使います。参照編集版を採用する場合は `--output-set v2-edit --reference tools/out/FGPD/candidate-1.png` へ置き換えます。同じ出力セットを分割実行しても、既存の `manifest.json` 項目は維持・統合されます。

### 32体（淑女／紳士）への移行と選定

確定画像は `_f`（淑女）／`_m`（紳士）で管理し、無印WebPは使いません。`tools/selected.json` と `tools/selected-32.json` は、タイプごとに確定元を追跡します。未選定側は `null` のままにします。

```json
{
  "FGPD": { "f": null, "m": "candidate-1.png" },
  "FTRD": { "f": "v2-edit/FTRD/candidate-2.png", "m": null }
}
```

不足側は同じタイプの確定PNGを参照するImages Editで生成します。淑女版は `tools/out/f/{CODE}/`、紳士版は `tools/out/m/{CODE}/` へ各3候補を保存します。

```powershell
node --use-system-ca tools/generate-characters.mjs --appearance f --code LGRC,LGRD,LGPC,LGPD,LTRC,LTRD,LTPC,LTPD,FGRC,FGPC,FGPD,FTRC,FTPD --count 3
node --use-system-ca tools/generate-characters.mjs --appearance m --code FGRD,FTRD,FTPC --count 3
node tools/build-character-contact-32.mjs
```

`tools/out/contact-32.html` では、各タイプの淑女／紳士を左右比較し、性別ごとの16体遠目一覧も確認できます。採用候補を選び「selected-32.jsonを保存」した後、内容を `tools/selected-32.json` へ反映します。

選定後の別作業で、透過余白をトリムし、共通パディングへ揃えて通常版と2倍版を作ります。

```powershell
node tools/finalize-characters.mjs --appearance f
node tools/finalize-characters.mjs --appearance m
```

出力名は `assets/characters/{TYPE_CODE}_f.webp` / `_m.webp` と、それぞれの `@2x` 版です。選定元・寸法・容量・透過状態は `assets/characters/manifest.json` の `{code}.{f|m}` にマージされます。アプリは「選択姿→反対姿→同名SVG→`assets/adult-silhouette.svg`」の順でフォールバックし、片方しか存在しない移行中は姿トグルを表示しません。

主な生成オプションは `--appearance f|m`、`--dry-run`、`--force`、`--output-set NAME`、`--reference PNG`、`--model MODEL_ID`、`--quality low|medium|high|auto` です。

## GitHub Pages公開

公開URLは `https://sn01dose.github.io/sub-rosa/` です。GitHubの `Settings` → `Pages` で `Deploy from a branch`、ブランチ `main`、フォルダー `/(root)` を選択します。サイトはビルドなしのハッシュルーターSPAとしてサブパス配信されます。

SNSカードは既存のFGPD画像とローカル日本語フォントを使って再生成できます。

```powershell
node tools/generate-og-card.mjs
```

出力は `assets/og-card.png`（1200×630）です。`index.html` のOG/Twitterメタデータは公開URL基準の絶対URL、サイト内のCSS・JavaScript・画像参照はGitHub Pagesのサブパスで動く相対URLに統一しています。検索回避の `noindex` は公開後も維持します。
