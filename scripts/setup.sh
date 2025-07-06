#!/bin/bash

# AWS CDKワークショップ - セットアップスクリプト
# このスクリプトは、開発環境のセットアップを自動化します

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

# 前提条件の確認
check_prerequisites() {
    print_info "前提条件を確認しています..."
    
    # Node.jsの確認
    if ! command -v node &> /dev/null; then
        print_error "Node.jsがインストールされていません。Node.js 22.x以上をインストールしてください。"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 22 ]; then
        print_error "Node.jsのバージョンが古すぎます。Node.js 22.x以上をインストールしてください。"
        exit 1
    fi
    
    print_success "Node.js $(node --version) が確認されました"
    
    # npmの確認
    if ! command -v npm &> /dev/null; then
        print_error "npmがインストールされていません。"
        exit 1
    fi
    
    print_success "npm $(npm --version) が確認されました"
    
    # AWS CLIの確認
    if ! command -v aws &> /dev/null; then
        print_warning "AWS CLIがインストールされていません。デプロイ時に必要になります。"
    else
        print_success "AWS CLI $(aws --version) が確認されました"
    fi
    
    # CDK CLIの確認
    if ! command -v cdk &> /dev/null; then
        print_warning "CDK CLIがインストールされていません。グローバルにインストールしますか？ (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            npm install -g aws-cdk
            print_success "CDK CLIがインストールされました"
        else
            print_info "CDK CLIはローカルのnpxコマンドで実行されます"
        fi
    else
        print_success "CDK CLI $(cdk --version) が確認されました"
    fi
}

# 依存関係のインストール
install_dependencies() {
    print_info "依存関係をインストールしています..."
    
    # ルートディレクトリの依存関係
    print_info "ルートディレクトリの依存関係をインストール..."
    npm ci
    
    # Slidevプロジェクトの依存関係
    print_info "Slidevプロジェクトの依存関係をインストール..."
    cd contents/slide
    npm ci
    cd ../..
    
    # CDKプロジェクトの依存関係
    print_info "CDKプロジェクトの依存関係をインストール..."
    cd cdk
    npm ci
    cd ..
    
    # Websiteプロジェクトの依存関係
    print_info "Websiteプロジェクトの依存関係をインストール..."
    cd website
    npm ci
    cd ..
    
    # Testプロジェクトの依存関係
    print_info "Testプロジェクトの依存関係をインストール..."
    cd test
    npm ci
    cd ..
    
    print_success "すべての依存関係がインストールされました"
}

# 初期ビルドの実行
initial_build() {
    print_info "初期ビルドを実行しています..."
    
    # Slidevプロジェクトのビルド
    print_info "Slidevプロジェクトをビルド..."
    cd contents/slide
    npm run build
    
    if [ -d "dist" ]; then
        print_success "Slidevビルドが完了しました"
    else
        print_error "Slidevビルドに失敗しました"
        exit 1
    fi
    
    cd ../..
    
    # CDKプロジェクトのビルド
    print_info "CDKプロジェクトをビルド..."
    cd cdk
    npm run build
    print_success "CDKビルドが完了しました"
    cd ..
    
    # Websiteプロジェクトのビルド
    print_info "Websiteプロジェクトをビルド..."
    cd website
    npm run build
    print_success "Websiteビルドが完了しました"
    cd ..
    
    # Testプロジェクトのビルド
    print_info "Testプロジェクトをビルド..."
    cd test
    npm run build
    print_success "Testビルドが完了しました"
    cd ..
}

# 開発環境の設定
setup_development() {
    print_info "開発環境を設定しています..."
    
    # Git hooksの設定
    if [ -d ".git" ]; then
        print_info "Git hooksを設定..."
        
        # pre-commitフックの作成
        cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
# pre-commit hook: 各プロジェクトのlintとformatを実行

echo "Running pre-commit checks..."

# Slidevプロジェクトのチェック
echo "Checking Slidev project..."
cd contents/slide
if [ -f "package.json" ]; then
    npm run build
fi
cd ../..

# CDKプロジェクトのチェック
echo "Checking CDK project..."
cd cdk
if [ -f "package.json" ]; then
    npm run build
    npm run test
fi
cd ..

# Websiteプロジェクトのチェック
echo "Checking Website project..."
cd website
if [ -f "package.json" ]; then
    npm run build
    npm run test
fi
cd ..

# Testプロジェクトのチェック
echo "Checking Test project..."
cd test
if [ -f "package.json" ]; then
    npm run build
    npm run test
fi
cd ..

echo "Pre-commit checks completed successfully!"
EOF
        
        chmod +x .git/hooks/pre-commit
        print_success "Git pre-commitフックが設定されました"
    fi
}

# 使用方法の表示
show_usage() {
    print_info "セットアップが完了しました！"
    echo ""
    echo "🚀 使用方法:"
    echo ""
    echo "📊 スライド開発:"
    echo "  cd contents/slide"
    echo "  npm run dev        # 開発サーバーを起動"
    echo "  npm run build      # ビルド"
    echo ""
    echo "☁️  CDKプロジェクト:"
    echo "  cd cdk"
    echo "  npm run build      # ビルド"
    echo "  npx cdk synth      # CloudFormationテンプレートを生成"
    echo "  npx cdk deploy     # デプロイ"
    echo ""
    echo "🌐 Websiteプロジェクト:"
    echo "  cd website"
    echo "  npm run build      # ビルド"
    echo "  npx cdk deploy     # デプロイ"
    echo ""
    echo "🧪 Testプロジェクト:"
    echo "  cd test"
    echo "  npm run build      # ビルド"
    echo "  npm run test       # テスト実行"
    echo ""
    echo "📚 詳細な使用方法については、README.mdを参照してください。"
}

# メイン処理
main() {
    echo "🎯 AWS CDKワークショップ - セットアップスクリプト"
    echo ""
    
    check_prerequisites
    install_dependencies
    initial_build
    setup_development
    show_usage
    
    print_success "セットアップが正常に完了しました！🎉"
}

# スクリプトの実行
main "$@" 