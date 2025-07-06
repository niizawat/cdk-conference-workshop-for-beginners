# AWS CDKワークショップ - 2025年版

このリポジトリは、AWS CDKワークショップ用の教材プロジェクトです。

## 📁 プロジェクト構成

```
cdk-conference-2025-workshop/
├── cdk/                    # メインのCDKサンプルプロジェクト
├── contents/
│   ├── slide/              # Slidevによるワークショップスライド
│   └── *.pdf               # 参考資料
├── website/                # スライドホスティング用CDKプロジェクト
├── test/                   # テスト用CDKプロジェクト
└── .github/workflows/      # GitHub Actions設定
```

## 🚀 自動デプロイ機能

このプロジェクトには、mainブランチにpushされた際に自動的にスライドをビルドし、AWSにデプロイするGitHub Actionsが設定されています。

### 📋 必要な設定

#### 1. GitHub Secretsの設定

リポジトリの `Settings > Secrets and variables > Actions` で以下のSecretを設定してください：

- `AWS_ROLE_TO_ASSUME`: GitHub ActionsからAssumeするIAMロールのARN（例：`arn:aws:iam::123456789012:role/GitHubActions-CDKWorkshop-Role`）

> **注意**: このプロジェクトでは、セキュリティ向上のためOIDC（OpenID Connect）認証を使用しています。従来のアクセスキーベースの認証は使用していません。

#### 2. AWS OIDC設定

GitHub ActionsとAWSの間でOIDC認証を設定する必要があります。

##### 🚀 自動設定（推奨）

OIDC認証を自動設定するには、以下のコマンドを実行してください：

```bash
# AWS認証を設定
aws configure
# または
aws sso login

# GitHub認証を設定
gh auth login

# OIDC認証を自動設定
./scripts/setup-oidc.sh
```

このスクリプトは以下を自動実行します：

- AWSにGitHub OIDCプロバイダーを作成
- 必要な権限を持つIAMポリシーとロールを作成
- GitHub Secretsを自動設定
- 設定の検証とテスト

##### 🛠️ 手動設定

自動設定が使用できない場合は、以下の手順に従ってください：

##### 2.1 GitHub OIDCプロバイダーをAWSに追加

1. AWS IAMコンソールでOIDCプロバイダーを作成：
   - プロバイダーURL: `https://token.actions.githubusercontent.com`
   - オーディエンス: `sts.amazonaws.com`

詳細は[GitHub公式ドキュメント](https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)または[詳細なOIDCセットアップ手順](docs/OIDC_SETUP.md)を参照してください。

##### 2.2 IAMロールと信頼ポリシーの設定

GitHub ActionsからAssumeするIAMロールを作成し、以下の権限を付与：

- CloudFormationの作成・更新・削除権限
- S3バケットの作成・管理権限
- CloudFrontディストリビューションの作成・管理権限
- IAMロールの作成・管理権限

**推奨ポリシー：**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "cloudformation:*",
                "s3:*",
                "cloudfront:*",
                "iam:*",
                "ssm:GetParameter",
                "ssm:GetParameters"
            ],
            "Resource": "*"
        }
    ]
}
```

**信頼ポリシー例：**
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    "token.actions.githubusercontent.com:sub": "repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/main"
                }
            }
        }
    ]
}
```

> **重要**: `YOUR-ORG/YOUR-REPO` を実際のGitHubリポジトリに置き換えてください。

### 🔄 ワークフロー概要

1. **トリガー**: mainブランチへのpush
2. **Slidevビルド**: `contents/slide/`でプレゼンテーションをビルド
3. **CDKデプロイ**: `website/`でCloudFront + S3構成をデプロイ
4. **成果物**: ビルドされたスライドがCloudFrontで配信

## 🛠️ ローカル開発

### 前提条件

- Node.js 22.x以上
- AWS CLI設定済み
- AWS CDK CLI (`npm install -g aws-cdk`)
- GitHub CLI（OIDC自動設定を使用する場合）

### 自動セットアップ

```bash
# 開発環境の自動セットアップ
npm run setup

# OIDC認証の自動設定
npm run setup:oidc

# OIDC設定のクリーンアップ（削除）
npm run setup:oidc:cleanup
```

### スライド開発

```bash
# スライドプロジェクトのディレクトリに移動
cd contents/slide

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev

# ビルド
npm run build
```

### CDKプロジェクトの操作

```bash
# Websiteプロジェクトのディレクトリに移動
cd website

# 依存関係をインストール
npm install

# CDKテンプレートを生成
npx cdk synth

# デプロイ
npx cdk deploy

# リソースを削除
npx cdk destroy
```

## 📊 含まれるプロジェクト

### 1. CDKサンプルプロジェクト (`cdk/`)
- AWS Translateを使用した翻訳Webアプリケーション
- API Gateway + Lambda + S3の構成

### 2. スライドプロジェクト (`contents/slide/`)
- Slidevによるプレゼンテーション
- AWS CDKワークショップ用教材

### 3. ウェブサイトプロジェクト (`website/`)
- CloudFront + S3でスライドを配信
- AWS Solutions Constructs使用

### 4. テストプロジェクト (`test/`)
- CDK学習・テスト用環境

## 🔧 トラブルシューティング

### GitHub Actionsでのエラー

**OIDC認証エラー**
- IAMロールのARNがGitHub Secretsに正しく設定されているか確認
- GitHub OIDCプロバイダーがAWSに正しく追加されているか確認
- IAMロールの信頼ポリシーが正しく設定されているか確認
- リポジトリのOrg/Repo名が信頼ポリシーと一致しているか確認

**ビルドエラー**
- Node.jsバージョンが22.xになっているか確認
- 依存関係の競合がないか確認

**デプロイエラー**
- CDKブートストラップが正しく実行されているか確認
- リソース名の競合がないか確認

## 📚 参考資料

- [AWS CDK公式ドキュメント](https://docs.aws.amazon.com/cdk/)
- [Slidev公式ドキュメント](https://sli.dev/)
- [GitHub Actions公式ドキュメント](https://docs.github.com/en/actions)

## 📝 ライセンス

このプロジェクトは学習目的で作成されています。 