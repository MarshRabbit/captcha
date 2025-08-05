import puppeteer from 'puppeteer-core'; // Layer 사용 시 'puppeteer-core'
import chromium from '@sparticuz/chromium'; // Lambda용 Chromium
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'; // 최신 AWS SDK v3

const s3Client = new S3Client({});

export const handler = async (event, context) => {
    // 환경 변수에서 설정값 가져오기
    const { LOGIN_URL, USER_ID, USER_PASSWORD, S3_BUCKET_NAME } = process.env;

    try {
        // 1. 브라우저 실행 및 로그인
        const browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.goto(LOGIN_URL, { waitUntil: 'networkidle0' });

        // 로그인 수행
        // (수정 필요) 실제 사이트의 ID, PW 입력 필드, 로그인 버튼의 선택자로 변경
        await page.type('#input-username', USER_ID);
        await page.type('#input-password', USER_PASSWORD);
        
       // const element = await page.waitForSelector('::-p-xpath(//*[@id="region-main"]/div/div/div/div[1]/div[1]/div[2]/form/div[2]/input)');
        await page.click('.btn-success');
        await page.waitForNavigation({ waitUntil: 'networkidle0' });
        console.log('로그인 성공.');

        // 1. 강의 목록보기 버튼 누르기
        // (수정필요) '강의 목록 버튼' 선택자로 변경
        const registerButtonSelector = 'ul.dropdown-mycourse-type > li:nth-child(6)';
        await page.waitForSelector(registerButtonSelector);
        await page.click(registerButtonSelector);
        console.log('수강 신청 버튼 클릭.');

        // 2. 강의 목록 로딩 대기
        // (수정 필요) 강의 목록 전체를 감싸는 컨테이너의 선택자로 변경
   //     const courseListContainerSelector = 'ul.dropdown-menu dropdown-mycourse-type';
   //     await page.waitForSelector(courseListContainerSelector, { visible: true });
  //      console.log('강의 목록 로딩 완료.');

        // 3. 수강 신청 버튼 클릭 및 팝업 대기
        // (수정 필요) 신청하려는 특정 강의의 '수강 신청' 버튼 선택자로 변경
  //      const registerButtonSelector = '#ielts-class .register-btn';
  //      await page.waitForSelector(registerButtonSelector);

        // 자동입력방지 팝업이 생성될 것을 미리 기대하고 리스너를 설정
   //     const popupPromise = new Promise(resolve => browser.once('targetcreated', target => resolve(target.page())));

        // 수강 신청 버튼 클릭 (이때 자동입력방지 팝업이 열림)
  //      await page.click(registerButtonSelector);
  //      console.log('수강 신청 버튼 클릭.');

        // 4. 팝업 창 제어 및 캡쳐
 //       const popupPage = await popupPromise;
//        await popupPage.waitForLoadState('networkidle0');
 //       console.log('자동입력방지 팝업 창을 감지했습니다.');

        // (수정 필요) 팝업 내의 자동입력방지코드 이미지 또는 컨테이너 선택자
        const captchaSelector = '.course_lists';
        await popupPage.waitForSelector(captchaSelector, { visible: true });
        
        const captchaElement = await popupPage.$(captchaSelector);
        const screenshotBuffer = await captchaElement.screenshot();

        // 5. S3에 저장
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
