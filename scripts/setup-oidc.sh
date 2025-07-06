#!/bin/bash

# AWS CDKワークショップ - OIDC認証自動設定スクリプト
# このスクリプトは、GitHub ActionsとAWSの間でOIDC認証を自動設定します

set -euo pipefail

# 色付きの出力関数
print_info() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

print_step() {
    echo -e "\033[1;35m[STEP]\033[0m $1"
}

# 前提条件の確認
check_prerequisites() {
    print_info "前提条件を確認しています..."
    
    # AWS CLIの確認
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLIがインストールされていません。"
        print_info "インストール方法: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
        exit 1
    fi
    
    # GitHub CLIの確認
    if ! command -v gh &> /dev/null; then
        print_error "GitHub CLIがインストールされていません。"
        print_info "インストール方法: brew install gh (macOS) または https://cli.github.com/"
        exit 1
    fi
    
    # AWS認証の確認
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLIの認証が設定されていません。"
        print_info "設定方法: aws configure"
        exit 1
    fi
    
    # GitHub認証の確認
    if ! gh auth status &> /dev/null; then
        print_error "GitHub CLIの認証が設定されていません。"
        print_info "設定方法: gh auth login"
        exit 1
    fi
    
    print_success "すべての前提条件が満たされています"
}

# 環境変数の取得
get_environment_info() {
    print_info "環境情報を取得しています..."
    
    # AWSアカウントIDを取得
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_info "AWSアカウントID: ${AWS_ACCOUNT_ID}"
    
    # AWSリージョンを取得
    AWS_REGION=$(aws configure get region || echo "ap-northeast-1")
    print_info "AWSリージョン: ${AWS_REGION}"
    
    # GitHubリポジトリ情報を取得
    if git remote get-url origin &> /dev/null; then
        GITHUB_REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
        print_info "GitHubリポジトリ: ${GITHUB_REPO}"
    else
        print_error "Gitリポジトリが見つかりません。GitHubリポジトリのルートで実行してください。"
        exit 1
    fi
    
    # 設定値の確認
    echo ""
    print_warning "以下の設定でOIDC認証を設定します："
    echo "  AWSアカウントID: ${AWS_ACCOUNT_ID}"
    echo "  AWSリージョン: ${AWS_REGION}"
    echo "  GitHubリポジトリ: ${GITHUB_REPO}"
    echo "  IAMロール名: GitHubActions-CDKWorkshop-Role"
    echo ""
    
    read -p "この設定で続行しますか？ (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "設定を中止しました。"
        exit 0
    fi
}

# ステップ1: GitHub OIDCプロバイダーをAWSに追加
create_oidc_provider() {
    print_step "ステップ1: GitHub OIDCプロバイダーをAWSに追加"
    
    PROVIDER_URL="https://token.actions.githubusercontent.com"
    THUMBPRINT="6938fd4d98bab03faadb97b34396831e3780aea1"
    
    # 既存のプロバイダーを確認
    if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com" &> /dev/null; then
        print_warning "GitHub OIDCプロバイダーは既に存在します。スキップします。"
        OIDC_PROVIDER_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    else
        print_info "GitHub OIDCプロバイダーを作成しています..."
        
        OIDC_PROVIDER_ARN=$(aws iam create-open-id-connect-provider \
            --url "${PROVIDER_URL}" \
            --thumbprint-list "${THUMBPRINT}" \
            --client-id-list "sts.amazonaws.com" \
            --query 'OpenIDConnectProviderArn' \
            --output text)
        
        print_success "OIDCプロバイダーが作成されました: ${OIDC_PROVIDER_ARN}"
    fi
}

# ステップ2: IAMポリシーの作成
create_iam_policy() {
    print_step "ステップ2: IAMポリシーの作成"
    
    POLICY_NAME="CDKWorkshop-GitHubActions-Policy"
    POLICY_DOCUMENT=$(cat <<EOF
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
EOF
)
    
    # 既存のポリシーを確認
    if aws iam get-policy --policy-arn "arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}" &> /dev/null; then
        print_warning "IAMポリシー '${POLICY_NAME}' は既に存在します。スキップします。"
        POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/${POLICY_NAME}"
    else
        print_info "IAMポリシーを作成しています..."
        
        POLICY_ARN=$(aws iam create-policy \
            --policy-name "${POLICY_NAME}" \
            --policy-document "${POLICY_DOCUMENT}" \
            --description "IAM Policy for CDK Workshop GitHub Actions" \
            --query 'Policy.Arn' \
            --output text)
        
        print_success "IAMポリシーが作成されました: ${POLICY_ARN}"
    fi
}

# ステップ3: IAMロールと信頼ポリシーの作成
create_iam_role() {
    print_step "ステップ3: IAMロールと信頼ポリシーの作成"
    
    ROLE_NAME="GitHubActions-CDKWorkshop-Role"
    TRUST_POLICY=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "${OIDC_PROVIDER_ARN}"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    "token.actions.githubusercontent.com:sub": "repo:${GITHUB_REPO}:ref:refs/heads/main"
                }
            }
        }
    ]
}
EOF
)
    
    # 既存のロールを確認
    if aws iam get-role --role-name "${ROLE_NAME}" &> /dev/null; then
        print_warning "IAMロール '${ROLE_NAME}' は既に存在します。"
        print_info "信頼ポリシーを更新しています..."
        
        aws iam update-assume-role-policy \
            --role-name "${ROLE_NAME}" \
            --policy-document "${TRUST_POLICY}"
        
        print_success "信頼ポリシーが更新されました"
    else
        print_info "IAMロールを作成しています..."
        
        aws iam create-role \
            --role-name "${ROLE_NAME}" \
            --assume-role-policy-document "${TRUST_POLICY}" \
            --description "IAM Role for CDK Workshop GitHub Actions"
        
        print_success "IAMロールが作成されました: ${ROLE_NAME}"
    fi
    
    # ポリシーをアタッチ
    print_info "ポリシーをロールにアタッチしています..."
    aws iam attach-role-policy \
        --role-name "${ROLE_NAME}" \
        --policy-arn "${POLICY_ARN}"
    
    ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${ROLE_NAME}"
    print_success "ポリシーがアタッチされました"
}

# ステップ4: GitHub Secretsの設定
set_github_secrets() {
    print_step "ステップ4: GitHub Secretsの設定"
    
    print_info "GitHub Secretsを設定しています..."
    
    # AWS_ROLE_TO_ASSUMEを設定
    echo "${ROLE_ARN}" | gh secret set AWS_ROLE_TO_ASSUME
    
    print_success "GitHub Secretsが設定されました"
    print_info "設定されたSecret:"
    print_info "  AWS_ROLE_TO_ASSUME: ${ROLE_ARN}"
}

# 設定の検証
verify_setup() {
    print_step "設定の検証"
    
    print_info "設定を検証しています..."
    
    # OIDCプロバイダーの確認
    if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "${OIDC_PROVIDER_ARN}" &> /dev/null; then
        print_success "✅ OIDCプロバイダーが正常に設定されています"
    else
        print_error "❌ OIDCプロバイダーの設定に問題があります"
    fi
    
    # IAMロールの確認
    if aws iam get-role --role-name "GitHubActions-CDKWorkshop-Role" &> /dev/null; then
        print_success "✅ IAMロールが正常に設定されています"
    else
        print_error "❌ IAMロールの設定に問題があります"
    fi
    
    # GitHub Secretsの確認
    if gh secret list | grep -q "AWS_ROLE_TO_ASSUME"; then
        print_success "✅ GitHub Secretsが正常に設定されています"
    else
        print_error "❌ GitHub Secretsの設定に問題があります"
    fi
}

# クリーンアップ関数（オプション）
cleanup() {
    if [[ "${1:-}" == "--cleanup" ]]; then
        print_warning "OIDC設定をクリーンアップしています..."
        
        # 環境変数を取得
        if aws sts get-caller-identity &> /dev/null; then
            AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
            POLICY_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:policy/CDKWorkshop-GitHubActions-Policy"
            OIDC_PROVIDER_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
        else
            print_error "AWS認証が設定されていません。aws configureを実行してください。"
            exit 1
        fi
        
        # IAMロールの削除
        print_info "IAMロールからポリシーをデタッチしています..."
        aws iam detach-role-policy --role-name "GitHubActions-CDKWorkshop-Role" --policy-arn "${POLICY_ARN}" 2>/dev/null || true
        
        print_info "IAMロールを削除しています..."
        aws iam delete-role --role-name "GitHubActions-CDKWorkshop-Role" 2>/dev/null || true
        
        # IAMポリシーの削除
        print_info "IAMポリシーを削除しています..."
        aws iam delete-policy --policy-arn "${POLICY_ARN}" 2>/dev/null || true
        
        # OIDCプロバイダーの削除
        print_info "OIDCプロバイダーを削除しています..."
        aws iam delete-open-id-connect-provider --open-id-connect-provider-arn "${OIDC_PROVIDER_ARN}" 2>/dev/null || true
        
        # GitHub Secretsの削除
        print_info "GitHub Secretsを削除しています..."
        gh secret delete AWS_ROLE_TO_ASSUME 2>/dev/null || true
        
        print_success "クリーンアップが完了しました"
        exit 0
    fi
}

# 使用方法の表示
show_usage() {
    echo "使用方法:"
    echo "  $0                  # OIDC認証を設定"
    echo "  $0 --cleanup        # OIDC設定をクリーンアップ"
    echo "  $0 --help           # このヘルプを表示"
}

# メイン処理
main() {
    echo "🔐 AWS CDKワークショップ - OIDC認証自動設定スクリプト"
    echo ""
    
    # 引数の処理
    case "${1:-}" in
        --cleanup)
            cleanup --cleanup
            ;;
        --help)
            show_usage
            exit 0
            ;;
        "")
            # 通常の設定処理
            ;;
        *)
            print_error "不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
    
    check_prerequisites
    get_environment_info
    create_oidc_provider
    create_iam_policy
    create_iam_role
    set_github_secrets
    verify_setup
    
    echo ""
    print_success "🎉 OIDC認証の設定が完了しました！"
    echo ""
    print_info "📋 設定サマリー:"
    echo "  AWSアカウントID: ${AWS_ACCOUNT_ID}"
    echo "  OIDCプロバイダー: ${OIDC_PROVIDER_ARN}"
    echo "  IAMロール: ${ROLE_ARN}"
    echo "  GitHubリポジトリ: ${GITHUB_REPO}"
    echo ""
    print_info "🚀 次のステップ:"
    echo "  1. mainブランチにコードをプッシュしてGitHub Actionsをテスト"
    echo "  2. 手動でワークフローを実行してOIDC認証をテスト"
    echo ""
    print_info "📚 詳細な情報:"
    echo "  - セットアップガイド: docs/OIDC_SETUP.md"
    echo "  - トラブルシューティング: README.md"
}

# エラーハンドリング
trap 'print_error "スクリプトの実行中にエラーが発生しました。詳細は上記のログを確認してください。"' ERR

# スクリプトの実行
main "$@" 