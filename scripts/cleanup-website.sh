#!/bin/bash

# AWS CDKワークショップ - Websiteスタッククリーンアップスクリプト

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

print_info "🗑️  Websiteスタッククリーンアップを開始します"

# 両方のリージョンでクリーンアップを試行
regions=("ap-northeast-1" "us-east-1")

for region in "${regions[@]}"; do
    print_info "リージョン ${region} でのクリーンアップを試行..."
    
    # 現在のリージョンを設定
    export AWS_DEFAULT_REGION=$region
    
    # WebsiteStackが存在するかチェック
    if aws cloudformation describe-stacks --stack-name WebsiteStack --region $region &> /dev/null; then
        print_warning "WebsiteStack が ${region} に存在します。削除しています..."
        
        # CDKでスタックを削除
        cd website
        AWS_REGION=$region npx cdk destroy WebsiteStack --force --region $region
        cd ..
        
        print_success "WebsiteStack を ${region} から削除しました"
    else
        print_info "WebsiteStack は ${region} に存在しません"
    fi
done

print_success "🎉 クリーンアップが完了しました！"
print_info "次のステップ："
print_info "1. mainブランチにpushしてGitHub Actionsで自動デプロイ"
print_info "2. または手動でデプロイ: cd website && npx cdk deploy --region us-east-1" 