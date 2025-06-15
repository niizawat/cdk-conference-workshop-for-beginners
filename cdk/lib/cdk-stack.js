"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CdkStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
class CdkStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3バケット（静的ファイル保存用）
        const websiteBucket = new s3.Bucket(this, 'TranslateWebsiteBucket', {
            bucketName: `translate-website-${this.account}-${this.region}`,
            publicReadAccess: false, // Lambda経由でアクセスするためpublicアクセスは無効
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
        // Lambda関数にTranslateの権限を付与
        translateFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['translate:TranslateText'],
            resources: ['*']
        }));
        // API GatewayがS3にアクセスするためのIAMロール
        const apiGatewayS3Role = new iam.Role(this, 'ApiGatewayS3Role', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
            inlinePolicies: {
                S3ReadPolicy: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: ['s3:GetObject'],
                            resources: [`${websiteBucket.bucketArn}/*`]
                        })
                    ]
                })
            }
        });
        // API Gateway（REST API）
        const api = new apigateway.RestApi(this, 'TranslateApi', {
            restApiName: 'Translate Service',
            description: 'AWS Translateを使用した翻訳API',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
            },
            // バイナリメディアタイプを設定（画像、CSS、JSファイルなど）
            binaryMediaTypes: [
                'image/*',
                'text/css',
                'application/javascript',
                'application/json',
                'text/html',
                'text/plain',
                'font/*'
            ]
        });
        // 翻訳用Lambda統合
        const translateIntegration = new apigateway.LambdaIntegration(translateFunction, {
            requestTemplates: { 'application/json': '{ "statusCode": "200" }' }
        });
        // /translateエンドポイントの作成
        const translateResource = api.root.addResource('translate');
        translateResource.addMethod('POST', translateIntegration);
        // ルートパス（/）用のS3統合 - index.htmlを返す
        const rootIntegration = new apigateway.AwsIntegration({
            service: 's3',
            integrationHttpMethod: 'GET',
            path: `${websiteBucket.bucketName}/index.html`,
            options: {
                credentialsRole: apiGatewayS3Role,
                passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                            'method.response.header.Cache-Control': "'public, max-age=3600'"
                        }
                    },
                    {
                        statusCode: '404',
                        selectionPattern: '404'
                    }
                ]
            }
        });
        api.root.addMethod('GET', rootIntegration, {
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Content-Type': true,
                        'method.response.header.Cache-Control': true
                    }
                },
                {
                    statusCode: '404'
                }
            ]
        });
        // 静的ファイル配信用のプロキシリソース（S3直接統合）
        const proxyIntegration = new apigateway.AwsIntegration({
            service: 's3',
            integrationHttpMethod: 'GET',
            path: `${websiteBucket.bucketName}/{proxy}`,
            options: {
                credentialsRole: apiGatewayS3Role,
                passthroughBehavior: apigateway.PassthroughBehavior.WHEN_NO_MATCH,
                requestParameters: {
                    'integration.request.path.proxy': 'method.request.path.proxy'
                },
                integrationResponses: [
                    {
                        statusCode: '200',
                        responseParameters: {
                            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
                            'method.response.header.Cache-Control': "'public, max-age=3600'"
                        }
                    },
                    {
                        statusCode: '404',
                        selectionPattern: '404'
                    }
                ]
            }
        });
        const proxyResource = api.root.addResource('{proxy+}');
        proxyResource.addMethod('GET', proxyIntegration, {
            requestParameters: {
                'method.request.path.proxy': true
            },
            methodResponses: [
                {
                    statusCode: '200',
                    responseParameters: {
                        'method.response.header.Content-Type': true,
                        'method.response.header.Cache-Control': true
                    }
                },
                {
                    statusCode: '404'
                }
            ]
        });
        // 出力値の設定
        new cdk.CfnOutput(this, 'WebsiteURL', {
            value: api.url,
            description: 'Website URL (via API Gateway)'
        });
        new cdk.CfnOutput(this, 'ApiGatewayURL', {
            value: api.url,
            description: 'API Gateway URL'
        });
        new cdk.CfnOutput(this, 'BucketName', {
            value: websiteBucket.bucketName,
            description: 'S3 Bucket Name'
        });
        // フロントエンドファイルのデプロイ
        new s3deploy.BucketDeployment(this, 'DeployWebsite', {
            sources: [s3deploy.Source.asset('./frontend')],
            destinationBucket: websiteBucket,
        });
    }
}
exports.CdkStack = CdkStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RrLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2RrLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLHVEQUF5QztBQUN6QywrREFBaUQ7QUFDakQsdUVBQXlEO0FBQ3pELHlEQUEyQztBQUMzQyx3RUFBMEQ7QUFFMUQsTUFBYSxRQUFTLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixvQkFBb0I7UUFDcEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNsRSxVQUFVLEVBQUUscUJBQXFCLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUM5RCxnQkFBZ0IsRUFBRSxLQUFLLEVBQUUsaUNBQWlDO1lBQzFELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtTQUN4QixDQUFDLENBQUM7UUFFSCxrQkFBa0I7UUFDbEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3ZFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDO1lBQy9DLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FB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QUFFO3dCQUNsQixxQ0FBcUMsRUFBRSxJQUFJO3dCQUMzQyxzQ0FBc0MsRUFBRSxJQUFJO3FCQUM3QztpQkFDRjtnQkFDRDtvQkFDRSxVQUFVLEVBQUUsS0FBSztpQkFDbEI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILFNBQVM7UUFDVCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNwQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEdBQUc7WUFDZCxXQUFXLEVBQUUsK0JBQStCO1NBQzdDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBRztZQUNkLFdBQVcsRUFBRSxpQkFBaUI7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDcEMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxVQUFVO1lBQy9CLFdBQVcsRUFBRSxnQkFBZ0I7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsbUJBQW1CO1FBQ25CLElBQUksUUFBUSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDbkQsT0FBTyxFQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDOUMsaUJBQWlCLEVBQUUsYUFBYTtTQUNqQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFyTEQsNEJBcUxDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgczNkZXBsb3kgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnQnO1xuXG5leHBvcnQgY2xhc3MgQ2RrU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBTM+ODkOOCseODg+ODiO+8iOmdmeeahOODleOCoeOCpOODq+S/neWtmOeUqO+8iVxuICAgIGNvbnN0IHdlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdUcmFuc2xhdGVXZWJzaXRlQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYHRyYW5zbGF0ZS13ZWJzaXRlLSR7dGhpcy5hY2NvdW50fS0ke3RoaXMucmVnaW9ufWAsXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiBmYWxzZSwgLy8gTGFtYmRh57WM55Sx44Gn44Ki44Kv44K744K544GZ44KL44Gf44KBcHVibGlj44Ki44Kv44K744K544Gv54Sh5Yq5XG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxuICAgIH0pO1xuXG4gICAgLy8gTGFtYmRh6Zai5pWw77yI57+76Kiz5Yem55CG55So77yJXG4gICAgY29uc3QgdHJhbnNsYXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdUcmFuc2xhdGVGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMl9YLFxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEvdHJhbnNsYXRlJyksXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgfSk7XG5cbiAgICAvLyBMYW1iZGHplqLmlbDjgatUcmFuc2xhdGXjga7mqKnpmZDjgpLku5jkuI5cbiAgICB0cmFuc2xhdGVGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogWyd0cmFuc2xhdGU6VHJhbnNsYXRlVGV4dCddLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXVxuICAgIH0pKTtcblxuICAgIC8vIEFQSSBHYXRld2F544GMUzPjgavjgqLjgq/jgrvjgrnjgZnjgovjgZ/jgoHjga5JQU3jg63jg7zjg6tcbiAgICBjb25zdCBhcGlHYXRld2F5UzNSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBcGlHYXRld2F5UzNSb2xlJywge1xuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2FwaWdhdGV3YXkuYW1hem9uYXdzLmNvbScpLFxuICAgICAgaW5saW5lUG9saWNpZXM6IHtcbiAgICAgICAgUzNSZWFkUG9saWN5OiBuZXcgaWFtLlBvbGljeURvY3VtZW50KHtcbiAgICAgICAgICBzdGF0ZW1lbnRzOiBbXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnXSxcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbYCR7d2Vic2l0ZUJ1Y2tldC5idWNrZXRBcm59LypgXVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICBdXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdhee+8iFJFU1QgQVBJ77yJXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnVHJhbnNsYXRlQXBpJywge1xuICAgICAgcmVzdEFwaU5hbWU6ICdUcmFuc2xhdGUgU2VydmljZScsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FXUyBUcmFuc2xhdGXjgpLkvb/nlKjjgZfjgZ/nv7voqLNBUEknLFxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XG4gICAgICAgIGFsbG93T3JpZ2luczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxuICAgICAgICBhbGxvd01ldGhvZHM6IGFwaWdhdGV3YXkuQ29ycy5BTExfTUVUSE9EUyxcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFtei1EYXRlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BcGktS2V5J10sXG4gICAgICB9LFxuICAgICAgLy8g44OQ44Kk44OK44Oq44Oh44OH44Kj44Ki44K/44Kk44OX44KS6Kit5a6a77yI55S75YOP44CBQ1NT44CBSlPjg5XjgqHjgqTjg6vjgarjganvvIlcbiAgICAgIGJpbmFyeU1lZGlhVHlwZXM6IFtcbiAgICAgICAgJ2ltYWdlLyonLFxuICAgICAgICAndGV4dC9jc3MnLFxuICAgICAgICAnYXBwbGljYXRpb24vamF2YXNjcmlwdCcsXG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ3RleHQvaHRtbCcsXG4gICAgICAgICd0ZXh0L3BsYWluJyxcbiAgICAgICAgJ2ZvbnQvKidcbiAgICAgIF1cbiAgICB9KTtcblxuICAgIC8vIOe/u+ios+eUqExhbWJkYee1seWQiFxuICAgIGNvbnN0IHRyYW5zbGF0ZUludGVncmF0aW9uID0gbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24odHJhbnNsYXRlRnVuY3Rpb24sIHtcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHsgJ2FwcGxpY2F0aW9uL2pzb24nOiAneyBcInN0YXR1c0NvZGVcIjogXCIyMDBcIiB9JyB9XG4gICAgfSk7XG5cbiAgICAvLyAvdHJhbnNsYXRl44Ko44Oz44OJ44Od44Kk44Oz44OI44Gu5L2c5oiQXG4gICAgY29uc3QgdHJhbnNsYXRlUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgndHJhbnNsYXRlJyk7XG4gICAgdHJhbnNsYXRlUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgdHJhbnNsYXRlSW50ZWdyYXRpb24pO1xuXG4gICAgLy8g44Or44O844OI44OR44K577yIL++8ieeUqOOBrlMz57Wx5ZCIIC0gaW5kZXguaHRtbOOCkui/lOOBmVxuICAgIGNvbnN0IHJvb3RJbnRlZ3JhdGlvbiA9IG5ldyBhcGlnYXRld2F5LkF3c0ludGVncmF0aW9uKHtcbiAgICAgIHNlcnZpY2U6ICdzMycsXG4gICAgICBpbnRlZ3JhdGlvbkh0dHBNZXRob2Q6ICdHRVQnLFxuICAgICAgcGF0aDogYCR7d2Vic2l0ZUJ1Y2tldC5idWNrZXROYW1lfS9pbmRleC5odG1sYCxcbiAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgY3JlZGVudGlhbHNSb2xlOiBhcGlHYXRld2F5UzNSb2xlLFxuICAgICAgICBwYXNzdGhyb3VnaEJlaGF2aW9yOiBhcGlnYXRld2F5LlBhc3N0aHJvdWdoQmVoYXZpb3IuV0hFTl9OT19NQVRDSCxcbiAgICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcbiAgICAgICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xuICAgICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5Db250ZW50LVR5cGUnOiAnaW50ZWdyYXRpb24ucmVzcG9uc2UuaGVhZGVyLkNvbnRlbnQtVHlwZScsXG4gICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNhY2hlLUNvbnRyb2wnOiBcIidwdWJsaWMsIG1heC1hZ2U9MzYwMCdcIlxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAge1xuICAgICAgICAgICAgc3RhdHVzQ29kZTogJzQwNCcsXG4gICAgICAgICAgICBzZWxlY3Rpb25QYXR0ZXJuOiAnNDA0J1xuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgYXBpLnJvb3QuYWRkTWV0aG9kKCdHRVQnLCByb290SW50ZWdyYXRpb24sIHtcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5Db250ZW50LVR5cGUnOiB0cnVlLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ2FjaGUtQ29udHJvbCc6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnNDA0J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAvLyDpnZnnmoTjg5XjgqHjgqTjg6vphY3kv6HnlKjjga7jg5fjg63jgq3jgrfjg6rjgr3jg7zjgrnvvIhTM+ebtOaOpee1seWQiO+8iVxuICAgIGNvbnN0IHByb3h5SW50ZWdyYXRpb24gPSBuZXcgYXBpZ2F0ZXdheS5Bd3NJbnRlZ3JhdGlvbih7XG4gICAgICBzZXJ2aWNlOiAnczMnLFxuICAgICAgaW50ZWdyYXRpb25IdHRwTWV0aG9kOiAnR0VUJyxcbiAgICAgIHBhdGg6IGAke3dlYnNpdGVCdWNrZXQuYnVja2V0TmFtZX0ve3Byb3h5fWAsXG4gICAgICBvcHRpb25zOiB7XG4gICAgICAgIGNyZWRlbnRpYWxzUm9sZTogYXBpR2F0ZXdheVMzUm9sZSxcbiAgICAgICAgcGFzc3Rocm91Z2hCZWhhdmlvcjogYXBpZ2F0ZXdheS5QYXNzdGhyb3VnaEJlaGF2aW9yLldIRU5fTk9fTUFUQ0gsXG4gICAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgJ2ludGVncmF0aW9uLnJlcXVlc3QucGF0aC5wcm94eSc6ICdtZXRob2QucmVxdWVzdC5wYXRoLnByb3h5J1xuICAgICAgICB9LFxuICAgICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW1xuICAgICAgICAgIHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxuICAgICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNvbnRlbnQtVHlwZSc6ICdpbnRlZ3JhdGlvbi5yZXNwb25zZS5oZWFkZXIuQ29udGVudC1UeXBlJyxcbiAgICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ2FjaGUtQ29udHJvbCc6IFwiJ3B1YmxpYywgbWF4LWFnZT0zNjAwJ1wiXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlOiAnNDA0JyxcbiAgICAgICAgICAgIHNlbGVjdGlvblBhdHRlcm46ICc0MDQnXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBwcm94eVJlc291cmNlID0gYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3twcm94eSt9Jyk7XG4gICAgcHJveHlSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIHByb3h5SW50ZWdyYXRpb24sIHtcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XG4gICAgICAgICdtZXRob2QucmVxdWVzdC5wYXRoLnByb3h5JzogdHJ1ZVxuICAgICAgfSxcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW1xuICAgICAgICB7XG4gICAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXG4gICAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XG4gICAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5Db250ZW50LVR5cGUnOiB0cnVlLFxuICAgICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ2FjaGUtQ29udHJvbCc6IHRydWVcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBzdGF0dXNDb2RlOiAnNDA0J1xuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG5cbiAgICAvLyDlh7rlipvlgKTjga7oqK3lrppcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2Vic2l0ZVVSTCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdXZWJzaXRlIFVSTCAodmlhIEFQSSBHYXRld2F5KSdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VVJMJywge1xuICAgICAgdmFsdWU6IGFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCdcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCdWNrZXROYW1lJywge1xuICAgICAgdmFsdWU6IHdlYnNpdGVCdWNrZXQuYnVja2V0TmFtZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQnVja2V0IE5hbWUnXG4gICAgfSk7XG5cbiAgICAvLyDjg5Xjg63jg7Pjg4jjgqjjg7Pjg4njg5XjgqHjgqTjg6vjga7jg4fjg5fjg63jgqRcbiAgICBuZXcgczNkZXBsb3kuQnVja2V0RGVwbG95bWVudCh0aGlzLCAnRGVwbG95V2Vic2l0ZScsIHtcbiAgICAgIHNvdXJjZXM6IFtzM2RlcGxveS5Tb3VyY2UuYXNzZXQoJy4vZnJvbnRlbmQnKV0sXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogd2Vic2l0ZUJ1Y2tldCxcbiAgICB9KTtcbiAgfVxufVxuIl19