#!/bin/bash

# Build and deploy Lambda function

echo "Building Lambda function..."
cd lambda
npm install
npx tsc

echo "Creating deployment package..."
# Create a zip file with all necessary files
zip -r function.zip *.js *.json node_modules -x "*.ts" -x "tsconfig.json" -x "deploy.sh"

echo "Creating Lambda function..."
aws lambda create-function \
  --function-name makeitlofi-processor \
  --runtime nodejs20.x \
  --role arn:aws:iam::872515281428:role/makeitlofi-lambda-role \
  --handler handler.handler \
  --timeout 900 \
  --memory-size 3008 \
  --ephemeral-storage Size=10240 \
  --environment "Variables={BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN,AWS_REGION=us-west-2,JOBS_TABLE=makeitlofi-jobs}" \
  --zip-file fileb://function.zip \
  --profile makeitlofi \
  2>/dev/null

if [ $? -eq 0 ]; then
  echo "Lambda function created successfully!"
else
  echo "Lambda function already exists, updating code..."
  aws lambda update-function-code \
    --function-name makeitlofi-processor \
    --zip-file fileb://function.zip \
    --profile makeitlofi
    
  echo "Updating function configuration..."
  aws lambda update-function-configuration \
    --function-name makeitlofi-processor \
    --timeout 900 \
    --memory-size 3008 \
    --ephemeral-storage Size=10240 \
    --environment "Variables={BLOB_READ_WRITE_TOKEN=$BLOB_READ_WRITE_TOKEN,AWS_REGION=us-west-2,JOBS_TABLE=makeitlofi-jobs}" \
    --profile makeitlofi
fi

echo "Creating SQS trigger for Lambda..."
aws lambda create-event-source-mapping \
  --function-name makeitlofi-processor \
  --event-source-arn arn:aws:sqs:us-west-2:872515281428:makeitlofi-jobs \
  --batch-size 1 \
  --profile makeitlofi \
  2>/dev/null || echo "SQS trigger might already exist"

echo "Deployment complete!"