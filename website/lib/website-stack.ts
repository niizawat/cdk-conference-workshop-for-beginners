import * as cdk from 'aws-cdk-lib';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { CloudFrontToS3 } from '@aws-solutions-constructs/aws-cloudfront-s3';

export class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CloudFront + S3 構成でスライドをホスト
    const cloudFrontS3 = new CloudFrontToS3(this, 'SlideHosting', {
      bucketProps: {
        // バケット名をアカウントIDとリージョンで一意にする
        bucketName: `cdk-workshop-slides-${this.account}-${this.region}`,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      },
      cloudFrontDistributionProps: {
        comment: 'CDK Workshop Slides Distribution',
        // SPAのデフォルトルートオブジェクトを設定
        defaultRootObject: 'index.html',
        // SPA向けのエラーページ設定
        errorResponses: [
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: '/index.html',
            ttl: cdk.Duration.minutes(5),
          },
        ],
      },
      // セキュリティヘッダーの自動挿入を有効化
      insertHttpSecurityHeaders: false,
    });

    // スライドの静的ファイルをS3にデプロイ
    // contents/slide/dist にビルド済みのスライドがあると仮定
    new s3deploy.BucketDeployment(this, 'DeploySlides', {
      sources: [s3deploy.Source.asset('../contents/slide/dist')],
      destinationBucket: cloudFrontS3.s3BucketInterface,
      distribution: cloudFrontS3.cloudFrontWebDistribution,
      distributionPaths: ['/*'],
    });

    // CloudFront Distribution URLを出力
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: `https://${cloudFrontS3.cloudFrontWebDistribution.distributionDomainName}`,
      description: 'CDK Workshop Slides URL',
    });

    // S3バケット名も出力（デバッグ用）
    new cdk.CfnOutput(this, 'S3BucketName', {
      value: cloudFrontS3.s3BucketInterface.bucketName,
      description: 'S3 Bucket Name for Slides',
    });
  }
}
