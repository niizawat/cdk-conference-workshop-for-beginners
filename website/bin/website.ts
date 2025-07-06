#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebsiteStack } from '../lib/website-stack';

const app = new cdk.App();
new WebsiteStack(app, 'WebsiteStack', {
  /* CloudFront functions require us-east-1 region
   * We need to explicitly set the region for proper deployment */
  env: { 
    account: process.env.CDK_DEFAULT_ACCOUNT, 
    region: 'us-east-1' // CloudFront functions are only available in us-east-1
  },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});