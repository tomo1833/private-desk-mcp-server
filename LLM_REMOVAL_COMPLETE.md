# LLM/Ollama 機能削除 - 完了報告

Private Desk MCP Server から LLM（Ollama）関連機能を削除済みです。

## 対応内容

- `src/utils/ollama.ts` を削除
- `search_private_desk` のローカル要約のみを利用
- Ollama 向け環境変数（`OLLAMA_*`）の廃止
- ドキュメント内の Ollama 参照を削除

## 影響範囲

- 検索結果は `buildLocalSummary` によるローカル要約のみ
- 追加の LLM 実行は行わない

## 変更後のツール

- 検索: `search_private_desk`
- 読み込み: `read_diary`, `read_wiki`, `read_blog`
- 作成: `write_diary`, `write_wiki`, `write_blog`
- 更新: `update_diary`, `update_wiki`, `update_blog`
- 削除: `delete_diary`, `delete_wiki`, `delete_blog`

## 参考

- Ollama は不要なのでインストール・設定は不要です
