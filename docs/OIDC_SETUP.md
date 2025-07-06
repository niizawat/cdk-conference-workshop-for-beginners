# GitHub Actions OIDC認証の詳細セットアップ手順

このドキュメントでは、GitHub ActionsとAWSの間でOIDC（OpenID Connect）認証を設定する詳細な手順を説明します。

## 🔐 なぜOIDCを使用するのか？

従来のアクセスキーベースの認証と比較して、OIDCには以下の利点があります：

- **セキュリティ向上**: 長期的なアクセスキーの管理が不要
- **権限の細かい制御**: 特定のリポジトリ・ブランチからのみアクセス可能
- **監査の強化**: より詳細なログとトレーサビリティ
- **管理の簡素化**: 定期的なキーローテーションが不要

## 📋 前提条件

- AWSアカウントの管理者権限
- GitHubリポジトリの管理者権限
- AWS CLI v2のインストール（オプション）

## 🛠️ セットアップ手順

### 🚀 自動セットアップ（推奨）

**ワンクリックでOIDC認証を設定したい場合は、以下の自動セットアップスクリプトを使用してください：**

```bash
# リポジトリルートで実行
./scripts/setup-oidc.sh
```

このスクリプトは以下の処理を自動実行します：

1. **前提条件の確認**：AWS CLI、GitHub CLI、認証情報の確認
2. **環境情報の取得**：AWSアカウントID、リージョン、GitHubリポジトリ情報の自動取得
3. **OIDCプロバイダーの作成**：GitHub Actions用のOIDCプロバイダーをAWSに追加
4. **IAMポリシーの作成**：CDKワークショップに必要な権限を含むポリシーを作成
5. **IAMロールの作成**：信頼ポリシーを含むロールを作成
6. **GitHub Secretsの設定**：AWS_ROLE_TO_ASSUMEを自動設定
7. **設定の検証**：全ての設定が正常に完了したか確認

#### 🔧 スクリプトの使用方法

```bash
# 通常の設定
./scripts/setup-oidc.sh

# ヘルプの表示
./scripts/setup-oidc.sh --help

# 設定のクリーンアップ（削除）
./scripts/setup-oidc.sh --cleanup
```

#### 📋 前提条件

スクリプトを実行する前に、以下のツールがインストールされていることを確認してください：

- **AWS CLI v2**：`aws --version`でv2以上であることを確認
- **GitHub CLI**：`gh --version`でインストールされていることを確認
- **Git**：GitHubリポジトリのローカルクローンが必要

#### 🔐 認証設定

スクリプト実行前に以下の認証を完了してください：

```bash
# AWS認証
aws configure
# または
aws sso login

# GitHub認証
gh auth login
```

---

### 🛠️ 手動セットアップ

**自動セットアップが使用できない場合や、詳細な設定を行いたい場合は以下の手動手順を実行してください：**

### ステップ1: GitHub OIDCプロバイダーをAWSに追加

1. **AWS IAMコンソールにアクセス**
   - https://console.aws.amazon.com/iam/

2. **OIDCプロバイダーを作成**
   - 左サイドバーから「Identity Providers」を選択
   - 「Add provider」をクリック
   - プロバイダータイプ: OpenID Connect
   - プロバイダーURL: `https://token.actions.githubusercontent.com`
   - オーディエンス: `sts.amazonaws.com`
   - 「Add provider」をクリック

3. **作成されたプロバイダーのARNを記録**
   - 作成されたプロバイダーのARNは次のような形式です：
   - `arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com`

### ステップ2: IAMロールの作成

1. **新しいIAMロールを作成**
   - IAMコンソールから「Roles」を選択
   - 「Create role」をクリック
   - 「Web identity」を選択
   - Identity provider: `token.actions.githubusercontent.com`
   - Audience: `sts.amazonaws.com`
   - 「Next」をクリック

2. **権限ポリシーをアタッチ**
   以下の権限を持つカスタムポリシーを作成・アタッチ：

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
                "iam:CreateRole",
                "iam:DeleteRole",
                "iam:AttachRolePolicy",
                "iam:DetachRolePolicy",
                "iam:PutRolePolicy",
                "iam:DeleteRolePolicy",
                "iam:GetRole",
                "iam:GetRolePolicy",
                "iam:PassRole",
                "iam:TagRole",
                "iam:UntagRole",
                "ssm:GetParameter",
                "ssm:GetParameters",
                "lambda:*",
                "apigateway:*",
                "translate:*",
                "comprehend:*"
            ],
            "Resource": "*"
        }
    ]
}
```

3. **ロール名を設定**
   - ロール名: `GitHubActions-CDKWorkshop-Role`
   - 説明: `GitHub Actions用のCDKワークショップロール`

### ステップ3: 信頼ポリシーの設定

作成したロールの信頼ポリシーを以下のように更新：

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

**重要な設定項目：**
- `123456789012`: 実際のAWSアカウントIDに置き換える
- `YOUR-ORG/YOUR-REPO`: GitHubのOrg名とリポジトリ名に置き換える

### ステップ4: GitHub Secretsの設定

1. GitHubリポジトリの設定画面にアクセス
2. `Settings > Secrets and variables > Actions`
3. 以下のSecretを追加：

| Name | Value | 例 |
|------|-------|-----|
| `AWS_ROLE_TO_ASSUME` | 作成したIAMロールのARN | `arn:aws:iam::123456789012:role/GitHubActions-CDKWorkshop-Role` |

## 🧪 テスト手順

### 1. 認証テスト

以下のテスト用ワークフローを作成して認証をテスト：

```yaml
name: OIDC認証テスト

on:
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  test-oidc:
    runs-on: ubuntu-latest
    steps:
    - name: AWS認証
      uses: aws-actions/configure-aws-credentials@v4
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_TO_ASSUME }}
        role-session-name: GitHubActions-Test
        aws-region: ap-northeast-1
    
    - name: AWS認証情報を確認
      run: |
        aws sts get-caller-identity
        echo "OIDC認証が正常に動作しています！"
```

### 2. CDKデプロイテスト

メインワークフローを実行してCDKデプロイが正常に動作することを確認。

## 🔍 トラブルシューティング

### よくあるエラーと解決方法

#### エラー1: `Error: Could not assume role`

**原因**: 信頼ポリシーの設定が間違っている

**解決方法**:
1. IAMロールの信頼ポリシーを確認
2. リポジトリのOrg/Repo名が正しいか確認
3. ブランチ名が正しいか確認（mainブランチ以外の場合）

#### エラー2: `Error: No credentials found`

**原因**: GitHub Secretsの設定が間違っている

**解決方法**:
1. `AWS_ROLE_TO_ASSUME`の値を確認
2. ロールのARNが正しい形式か確認

#### エラー3: `AccessDenied: User is not authorized`

**原因**: IAMロールの権限が不足している

**解決方法**:
1. IAMロールにアタッチされたポリシーを確認
2. 必要な権限が含まれているか確認

## 📚 参考資料

- [GitHub公式ドキュメント: Configuring OpenID Connect in Amazon Web Services](https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS公式ドキュメント: Creating OpenID Connect identity providers](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html)
- [aws-actions/configure-aws-credentials アクション](https://github.com/aws-actions/configure-aws-credentials)

## 🔐 セキュリティのベストプラクティス

1. **最小権限の原則**: 必要最小限の権限のみを付与
2. **定期的な監査**: IAMロールの使用状況を定期的に確認
3. **条件付きアクセス**: 信頼ポリシーでより厳格な条件を設定
4. **ログの監視**: CloudTrailでAssumeRole APIの使用状況を監視

## 🎯 追加の設定オプション

### 複数ブランチでの使用

開発・ステージング・本番環境で異なるブランチを使用する場合：

```json
{
    "StringLike": {
        "token.actions.githubusercontent.com:sub": "repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/*"
    }
}
```

### Pull Requestでの使用

Pull Requestからのデプロイを許可する場合：

```json
{
    "StringLike": {
        "token.actions.githubusercontent.com:sub": [
            "repo:YOUR-ORG/YOUR-REPO:ref:refs/heads/main",
            "repo:YOUR-ORG/YOUR-REPO:pull_request"
        ]
    }
}
```

---

この設定により、GitHub ActionsとAWSの間でより安全で管理しやすいOIDC認証が実現できます。 