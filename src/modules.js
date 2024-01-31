const axios = require('axios');
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');

async function launchBrowser() {
    const pathToExtension = path.join(process.cwd(), 'extension');
    return await puppeteer.launch({
        headless: false,
        args: [
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
        ],
    });
}

async function loginFacebook(browser, accountsData) {
    const pages = await browser.pages();
    const facebookPage = pages.length > 0 ? pages[0] : await browser.newPage();
    await facebookPage.goto('https://mbasic.facebook.com/');
    const allPages = await browser.pages();
    if (allPages.length > 1) {
        const extensionPage = allPages[1];
        await extensionPage.close();
    }
    await facebookPage.type('input[name="email"]', accountsData.facebook_username);
    await facebookPage.type('input[name="pass"]', accountsData.facebook_password);
    await facebookPage.keyboard.press('Enter');
    await facebookPage.waitForNavigation();
    const key = accountsData.facebook_2fa.replace(/\s+/g, '');
    const apiUrl = `https://2fa.live/tok/${key}`;
    const response = await axios.get(apiUrl);
    const code = response.data.token;

    await facebookPage.type('input#approvals_code', code);
    await facebookPage.keyboard.press('Enter');
    await facebookPage.waitForNavigation();
    await facebookPage.click('input[type="submit"]');
    let currentUrl = facebookPage.url();
    let i = 0;
    while (i < 9) {
        if (currentUrl.includes('checkpoint')) {
            const newPassword = await facebookPage.$('input[name="password_new"]');
            if (newPassword) {
                await facebookPage.type('input[name="password_new"]', '93XpEP^@s');
                await facebookPage.click('input[type="submit"]');
                const rawData = fs.readFileSync(accountsPath);
                const jsonData = JSON.parse(rawData);
                jsonData.facebook_password = '93XpEP^@s';
                const updatedData = JSON.stringify(jsonData, null, 2);
                fs.writeFileSync(accountsPath, updatedData);
            }
            else if (i == 8) {
                const rawData = fs.readFileSync(accountsPath);
                const jsonData = JSON.parse(rawData);
                jsonData.facebook_username = 'checkpoint';
                jsonData.facebook_password = 'checkpoint';
                jsonData.facebook_2fa = 'checkpoint';
                const updatedData = JSON.stringify(jsonData, null, 2);
                fs.writeFileSync(accountsPath, updatedData);
                break;
            }
            else {
                await facebookPage.click('input[type="submit"]');
            }
            currentUrl = facebookPage.url();
            i++;
        } else {
            break;
        }
    }
}
async function loginAds(browser, accountsData) {
    const pages = await browser.pages();
    const adsPage = pages.length > 0 ? pages[0] : await browser.newPage();
    await adsPage.goto('https://dashboard.smit.vn/');
    await adsPage.type('#username', accountsData.ads_username);
    await adsPage.type('#password', accountsData.ads_password);
    await adsPage.keyboard.press('Enter');
    await adsPage.waitForNavigation();
    return adsPage
}
async function reloadPixelData(adsPage) {
    await adsPage.goto('https://adscheck.smit.vn/app/share-pixel');
    const buttonSelector = 'button.btn.btn-gradient.w-full.h-40.mt-15';
    await adsPage.waitForSelector(buttonSelector);
    await adsPage.click(buttonSelector);
    const toggleSharePixelSelector = '.config-toggle';
    await adsPage.waitForSelector(toggleSharePixelSelector);
    await adsPage.click(toggleSharePixelSelector);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const elements = await adsPage.$$('span.text-semibold');
    const jsonFilePath = 'data/pixels.json';
    let pixelData = [];
    let count = 1;
    const uniqueSet = new Set();
    for (let i = 0; i < elements.length; i += 2) {
        const pixelText = await adsPage.evaluate(el => el.textContent, elements[i]);
        if (!uniqueSet.has(pixelText)) {
            pixelData.push({ i, count, pixelText });
            uniqueSet.add(pixelText);
            count++;
        }
    }
    fs.writeFileSync(jsonFilePath, JSON.stringify(pixelData, null, 2));
    await adsPage.click(toggleSharePixelSelector);
}
async function closeBrowser(browser) {
    await browser.close();
}

module.exports = {
    launchBrowser,
    loginFacebook,
    loginAds,
    reloadPixelData,
    closeBrowser,
};