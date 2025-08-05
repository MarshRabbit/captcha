import puppeteer from 'puppeteer-core'; // Layer 사용 시 'puppeteer-core'
import chromium from '@sparticuz/chromium'; // Lambda용 Chromium
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // 최신 AWS SDK v3

const s3Client = new S3Client({});

export const handler = async (event, context) => {
    // 환경 변수에서 설정값 가져오기
    const { LOGIN_URL, USER_ID, USER_PASSWORD, S3_BUCKET_NAME } = process.env;

    let browser = null

    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.goto("https://nid.naver.com", { waitUntil: 'networkidle0' });
        
        const loadContentButtonSelector = '#qrcode';
        await page.click(loadContentButtonSelector);
        console.log('컨텐츠 로딩 버튼 클릭.');
 
        const captchaSelector = 'img[alt="QR Code"]';
        await page.waitForSelector(captchaSelector, { visible: true });
        const elementToCapture = await page.$(captchaSelector);
        const screenshotBuffer = await elementToCapture.screenshot();


        const s3Key = `captchas/captcha-${Math.floor(new Date().getTime()/1000)}.png`;
        const putCommand = new PutObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: s3Key,
            Body: screenshotBuffer,
            ContentType: 'image/png',
        });
        await s3Client.send(putCommand);
        console.log(`S3 저장 성공: ${s3Key}`);

        await page.close()
        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Captcha captured successfully!', s3Key }),
        };

    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to capture captcha.', error: error.message }),
        };
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};
