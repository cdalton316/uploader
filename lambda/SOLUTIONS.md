# Solutions for Sharp Linux Runtime Issue

## Problem
`sharp` has native bindings that are platform-specific. Installing on Windows creates Windows binaries that won't work on Lambda's Linux runtime.

## Solution 1: Use Jimp (Pure JavaScript) ⭐ RECOMMENDED

**Pros:**
- Pure JavaScript - works on any platform
- No native dependencies
- Easy to package and deploy
- Smaller package size

**Cons:**
- Slower than sharp (but still fast enough for most use cases)
- Slightly different API

**Steps:**
1. Replace `index.js` with `index-jimp.js`
2. Replace `package.json` with `package-jimp.json`
3. Run `npm install` in the lambda folder
4. Package and deploy as usual

```powershell
cd lambda
# Backup current files
Copy-Item index.js index-sharp.js.backup
Copy-Item package.json package-sharp.json.backup

# Use Jimp version
Copy-Item index-jimp.js index.js
Copy-Item package-jimp.json package.json

# Install and package
npm install
.\package-lambda.ps1
```

---

## Solution 2: Install Sharp for Linux

**Pros:**
- Fastest performance
- Best image quality
- More features

**Cons:**
- Requires Docker or Linux environment
- More complex setup

**Steps:**

### Option A: Using Docker (Recommended)

```powershell
# Create a Dockerfile in lambda folder
cd lambda

# Run npm install in a Linux container
docker run --rm -v ${PWD}:/var/task -w /var/task public.ecr.aws/lambda/nodejs:20 npm install --production

# Then package normally
.\package-lambda.ps1
```

### Option B: Using WSL (Windows Subsystem for Linux)

```bash
# In WSL terminal
cd /mnt/c/Users/unive/Documents/uploader/lambda
npm install --production
zip -r ../watermark-lambda.zip . -x "*.git*" -x "node_modules/.cache/*"
```

### Option C: Manual Linux Installation

```powershell
cd lambda
# Remove node_modules
Remove-Item -Recurse -Force node_modules

# Install for Linux platform
$env:npm_config_platform="linux"
$env:npm_config_arch="x64"
npm install --production sharp

# Package
.\package-lambda.ps1
```

---

## Solution 3: Use AWS Lambda Layers for Sharp

**Pros:**
- Pre-built and optimized
- No need to package sharp with your code
- Smaller deployment package

**Cons:**
- Requires adding a layer to your Lambda function
- Less control over sharp version

**Steps:**

1. **Add Sharp Lambda Layer to your function:**
   - Go to Lambda Console → Your function → Layers
   - Add layer: `arn:aws:lambda:us-east-1:451483290750:layer:sharp:1` (for us-east-1)
   - Or find the latest: https://github.com/umputun/aws-lambda-layers

2. **Update package.json** - Remove sharp from dependencies:
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.955.0"
  }
}
```

3. **Keep your original index.js** (the one using sharp)

4. **Package without sharp:**
```powershell
cd lambda
npm install
.\package-lambda.ps1
```

---

## Recommendation

**Use Solution 1 (Jimp)** - It's the simplest and will work immediately without any additional setup. The performance difference is negligible for watermarking operations, and it's much easier to maintain.

