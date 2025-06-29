---
fonts:
  sans: Noto Sans JP
  serif: Noto Serif JP
  mono: Fira Code
theme: neversink
layout: cover
---

# AWS CDKワークショップ

::note::

AWS CDKでインフラ構築を体験しよう！
90分で「できる！」を実感
TypeScriptで学ぶIaC

<!--
参加者の緊張をほぐすように、明るく元気にスタートしましょう。
-->

---
layout: top-title-two-cols
color: amber
align: l-lt-lt
---

::title::

# 自己紹介

::left::

自己紹介

::right::

画像

---
layout: top-title
color: amber
---

::title::

# 本日のゴール

::content::

- CDKの基本を理解する
- サンプルコードでCDKの威力を体験
- 自分でWebアプリのインフラを構築
- 「できた！」を持ち帰る

<!--
参加者が今日何を得られるかを明確にして、モチベーションを高めましょう。
-->

---
layout: top-title
color: amber
---

::title::

# 事前準備の確認

::content::

- ✅ AWSアカウント（Admin権限）
- ✅ ノートPC持参

---
layout: top-title
color: amber
---

::title::

# 本日の流れ

::content::

1. CDKの概要
2. ワークショップ環境の構築
3. サンプルコードでCDKを動かす
4. コードの中身を理解
5. 自分でWebアプリのインフラを構築
6. まとめ・質疑応答

---
layout: top-title
color: amber
---

::title::

# AWS CDKとは？

::content::

- AWSのインフラをTypeScriptなどで記述できるツール
- 「レゴブロック」のように部品を組み合わせて作る感覚
- AWS公式サポートの代表的なIaCツール

```mermaid
graph LR
    Code[TypeScriptコード] --> CDK[AWS CDK]
    CDK --> CF[CloudFormation]
    CF --> AWS[AWSリソース]
```

---
layout: top-title
color: amber
---

::title::

# CDKの特徴・メリット

::content::

- コードでAWSリソースを管理
- 再利用・自動化が簡単
- AWS公式サポート
- TypeScript / JavaScript / Python / Java / C# / Golangに対応

---
layout: top-title-two-cols
color: amber
align: l-lt-lt
---

::title::

# CDKの多言語対応例

::left::

## TypeScript

```ts
export class S3Stack extends cdk.Stack {
  constructor(scope: Construct, id: string,
   props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'MyBucket', {
      bucketName: 'my-example-bucket-12345',
      versioned: true,
      publicReadAccess: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName
    });
  }
}
```

::right::

## Python

```python
class S3Stack(Stack):
    def __init__(self, scope: Construct, 
      construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        bucket = s3.Bucket(self, "MyBucket",
            bucket_name="my-example-bucket-12345",
            versioned=True,
            public_read_access=False,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True
        )

        CfnOutput(self, "BucketName",
            value=bucket.bucket_name
        )
```

---
layout: top-title
color: amber
---

::title::

# Visual Studio Code Serverを構築しよう

::content::

**構築手順：**

1. 「TypeScript の基礎から始める AWS CDK 開発入門」にアクセス
    - https://catalog.workshops.aws/typescript-and-cdk-for-beginner/ja-JP

2. 左メニューから「開発環境のセットアップ」→「ご自身で実施するワークショップ」→「Visual Studio Code Server のセットアップ」にアクセス

2. ”Asia Pacific (Tokyo) ap-northeast-1"の「Launch Stack」ボタンをクリック

3. 以降、ページに記載された手順に従って、Visual Studio Code IDEを表示するところまで進めてください。

※ デプロイには約8分程度かかります。

---
layout: top-title
color: amber
---

::title::

# 体験：サンプルコードでCDKを動かしてみよう

::content::

事前に用意した翻訳Webアプリのサンプルコードを使って、CDKの威力を体験しましょう！

**手順：**
1. リポジトリをクローン
2. 依存関係をインストール
3. CDKコマンドでデプロイ
4. AWS上にリソースが作られる様子を確認
5. 実際にWebアプリを動かしてみる

**所要時間：** 約10-15分

---
layout: top-title
color: amber
---

::title::

# 実行手順

::content::

<!-- 実際にVSCodeの画面で見せる -->

```bash
# 1. リポジトリクローン
git clone https://github.com/niizawat/cdk-workshop-example.git
cd cdk-workshop-example

# 2. 依存関係インストール
npm install

# 3. CDK動作確認
cdk synth
# 生成されたCloudFormationテンプレートが表示されればOK

# 4. AWSへデプロイ
cdk deploy
........
Do you wish to deploy these changes (y/n)?  <-- yを入力
```

---
layout: top-title
color: amber
---

::title::

# デプロイ後 の出力例

::content::

```bash
AppStack: deploying... [1/1]
AppStack: creating CloudFormation changeset...

 ✅  AppStack

✨  Deployment time: 94.21s

Outputs:
AppStack.ApiGatewayURL = https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
AppStack.BucketName = translate-website-123456789012-ap-northeast-1
AppStack.TranslateApiEndpointBF4D5864 = https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
AppStack.WebsiteURL = https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/
Stack ARN:
arn:aws:cloudformation:ap-northeast-1:123456789012:stack/AppStack/d9b61de0-5485-11f0-a14f-06c66a81218f

✨  Total time: 97.31s
```

---
layout: top-title-two-cols
color: amber
align: l-lt-lt
---

::title::
# デプロイ後の動作確認

::left::

1. **Webアプリにアクセス**
   - ブラウザで `Website URL`にアクセス
   - アプリの画面が表示されることを確認

2. **翻訳APIのテスト**
   - ブラウザ上で翻訳機能を試す

::right::

![画像](./images/demo.png)

---
layout: top-title
color: amber
---

::title::

# サンプルコードのアーキテクチャ

::content::

<br/>
<br/>

```mermaid
%%{init: {'theme':'default', 'look': 'handDrawn'}}%%
graph LR
  subgraph "フロントエンド"
    A["Webブラウザ"]
  end

  subgraph "バックエンド"
    B[("S3バケット<br/>(HTMLアプリ静的ホスティング)")]
    C["API Gateway"]
    D["Lambda関数<br/>(翻訳処理)"]
    E["Amazon Translate"]
    F["Amazon Comprehend"]
    A-->|"Webページ取得<br/>(GET /)"|C
    C-->|"S3直接統合"|B
    B-->|"HTMLファイル"|C
    C-->|"Webページ"|A
    A-->|"翻訳リクエスト<br/>(POST /translate)"|C
    C-->|"Lambda呼び出し"|D
    D-->|"翻訳リクエスト<br/>(sourceLang: auto)"|E
    E-->|"言語検出要求"|F
    F-->|"検出された言語"|E
    E-->|"翻訳結果"|D
    D-->|"レスポンス"|C
    C-->|"APIレスポンス"|A
  end
```

---
layout: top-title
color: amber
---

::title::

# CDKアプリケーションの基本的なディレクトリ構造

::content::

```sh
├── bin/
│   └── cdk.ts          # CDKアプリのエントリーポイント
├── lib/
│   └── app-stack.ts    # スタック定義（メインのインフラコード）
├── test/               # テストファイル格納ディレクトリ
├── cdk.json           # CDKプロジェクトの設定ファイル
├── jest.config.js      # テスト設定ファイル
└── tsconfig.json      # TypeScript設定ファイル
```

---
layout: top-title
color: amber
---

::title::

# CDKアプリのエントリーポイント

::content::

`bin/cdk.ts` はCDKアプリケーションのメインエントリーポイントです

```ts {monaco}
#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { AppStack } from '../lib/app-stack';

const app = new cdk.App();
new AppStack(app, 'AppStack', {
  /* 環境設定のオプション */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  // env: { account: '123456789012', region: 'us-east-1' },
});
```

**各行の解説：**
- `import * as cdk` - AWS CDKのコアライブラリを読み込み
- `import { AppStack }` - 自作のスタック定義を読み込み
- `new cdk.App()` - CDKアプリケーションのインスタンスを作成
- `new AppStack()` - スタックをアプリに追加

---
layout: top-title
color: amber
---

::title::

# CDKスタックの定義

::content::

```ts {monaco}
export class AppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3バケット（静的ファイル保存用）
    const websiteBucket = new s3.Bucket(this, 'TranslateWebsiteBucket', {
      bucketName: `translate-website-${this.account}-${this.region}`,
      publicReadAccess: false, // API Gateway経由でアクセスするためpublicアクセスは無効
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    
    // Lambda関数（翻訳処理用）
    const translateFunction = new lambda.Function(this, 'TranslateFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/translate'),
      timeout: cdk.Duration.seconds(30),
    });

    // Lambda関数にTranslateとComprehendの権限を付与
    translateFunction.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'translate:TranslateText',
        'comprehend:DetectDominantLanguage'
      ],
      resources: ['*']
    }));

    // API Gateway（REST API）
    const api = new apigateway.RestApi(this, 'TranslateApi', {
      restApiName: 'Translate Service',
      description: 'AWS Translateを使用した翻訳API',
      binaryMediaTypes: [
        'image/*', 'text/css', 'application/javascript',
        'application/json', 'text/html', 'text/plain', 'font/*'
      ]
    });
  }
}
```

<!--
実際のコードを見せながら、「これだけでこんなに多くのリソースが作れる」ことを強調しましょう。
-->

---
layout: top-title
color: amber
---

::title::

# ハンズオン：シンプルなAPIを作ってみよう

::content::

まずは基本から！Hello WorldのAPIを作成しましょう

**使用するAWSサービス：**

- Lambda（Hello World処理）
- API Gateway（APIエンドポイント）

**作成するAPI：**
- `GET /hello` → `Hello, World!`を返す

---
layout: top-title
color: amber
---

::title::

# CDKプロジェクトの作成

::content::

```bash
# 新しいディレクトリを作成
mkdir my-hello-api
cd my-hello-api

# CDKプロジェクトを初期化
cdk init app --language typescript

# 必要なパッケージをインストール
npm install
```

---
layout: top-title
color: amber
---

::title::

# Lambda関数を作成しよう

::content::

Lambda = サーバーレスでコードを実行

まず、Lambda関数のコードファイルを作成します：

```bash
# Lambdaコード用のディレクトリを作成
mkdir -p lambda/hello

# Lambda関数のファイルを作成
touch lambda/hello/index.js
```

`lambda/hello/index.js` をエディタで開き、以下のコードを入力してください：

```js
exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'Hello, World!',
      timestamp: new Date().toISOString()
    })
  };
};
```

次に、`lib/my-hello-api-stack.ts`を以下のように変更してLambda関数を定義します：

```ts {monaco}
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class HelloApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda関数（Hello World処理用）
    const helloFunction = new lambda.Function(this, 'HelloFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/hello'),
    });
  }
}
```

---
layout: top-title
color: amber
---

::title::

# API Gatewayを作成しよう

::content::

コードをどこに追加するのか説明を加える

diffをみる

```ts {monaco}
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

// API Gateway（REST API）
const api = new apigateway.RestApi(this, 'HelloApi', {
  restApiName: 'Hello World API',
  description: 'シンプルなHello World API',
});

// Lambda統合
const helloIntegration = new apigateway.LambdaIntegration(helloFunction);

// /helloエンドポイントの作成
const helloResource = api.root.addResource('hello');
helloResource.addMethod('GET', helloIntegration);

// 出力値の設定
new cdk.CfnOutput(this, 'ApiUrl', {
  value: api.url,
  description: 'API Gateway URL'
});
```

最終的なコードを確認してもらう
ライブコーディングでもよさそう

---
layout: top-title
color: amber
---

::title::

# 動作確認してみよう

::content::

```bash
# デプロイ
cdk deploy

# 出力されるAPI URLにアクセス
curl https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/prod/hello

# レスポンス例
{
  "message": "Hello, World!",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---
layout: top-title
color: amber
---

::title::

# 🎉 おめでとうございます！

::content::

基本のAPIができました！

**できたこと：**
- Lambda関数の作成
- API Gatewayの設定
- CDKでのデプロイ

---
layout: top-title
color: amber
---

::title::

# 🚀 発展課題にチャレンジ！

::content::

基本ができた方は、以下の課題にチャレンジしてみましょう：

**レベル1：パラメータを受け取る**
- `/hello/{name}` で名前を受け取り、`Hello, {name}!`を返す

**レベル2：POST APIを作る**
- `POST /echo` でリクエストボディをそのまま返す

**レベル3：外部サービス連携**
- Amazon Translateを使った翻訳API
- DynamoDBを使ったデータ保存API
- S3を使ったファイルアップロードAPI

API Documentのリンク

---
layout: top-title
color: amber
---

::title::

# 発展課題：Amazon Translate API

::content::

```ts {monaco}
// Lambda関数にTranslateとComprehendの権限を付与
translateFunction.addToRolePolicy(new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: [
    'translate:TranslateText',
    'comprehend:DetectDominantLanguage'
  ],
  resources: ['*']
}));

// /translateエンドポイントの作成
const translateResource = api.root.addResource('translate');
translateResource.addMethod('POST', new apigateway.LambdaIntegration(translateFunction));
```

**Lambda関数の例：**
```js
const { TranslateClient, TranslateTextCommand } = require('@aws-sdk/client-translate');

exports.handler = async (event) => {
  const { text, targetLang = 'ja' } = JSON.parse(event.body);
  
  const translateClient = new TranslateClient({ region: process.env.AWS_REGION });
  const result = await translateClient.send(new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: 'auto',
    TargetLanguageCode: targetLang
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({ translatedText: result.TranslatedText })
  };
};
```

---
layout: top-title
color: amber
---

::title::

# 片付け（重要！）

::content::

作成したリソースを削除して、課金を防ぎましょう

```bash
# リソースを削除
cdk destroy
```

VSCode Serverを削除

---
layout: top-title
color: amber
---

::title::

# まとめ

::content::

**今日学んだこと：**

- CDKでインフラをコードで管理する方法
- TypeScriptでAWSリソースを定義する書き方
- デプロイから削除までの一連の流れ

**CDKの魅力：**

- 再利用可能
- バージョン管理できる
- チームで共有しやすい

---
layout: top-title
color: amber
---

::title::

# さらに学ぶために

::content::

- **AWS CDK公式ドキュメント**: <https://docs.aws.amazon.com/cdk/>
- **CDK Examples**: <https://github.com/aws-samples/aws-cdk-examples>
- **AWS CDK Workshop**: <https://cdkworkshop.com/>

---
layout: top-title
color: amber
---

::title::

# 質疑応答

::content::

ご質問をお聞かせください！

- CDKに関する疑問
- 今日のハンズオンについて
- 実際の現場での活用方法

<!--
最後は「お疲れさまでした！」と笑顔で締めくくりましょう。
参加者の達成感を称えることを忘れずに。
-->

---
layout: top-title
color: amber
---

::title::

# ありがとうございました

::content::

お疲れさまでした！
皆さんの今後のAWS CDK活用を応援しています 🎉

**アンケートのご協力をお願いします**
