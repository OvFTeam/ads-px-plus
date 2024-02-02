const axios = require('axios');
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');

async function launchBrowser() {
    const pathToExtension = path.join(process.cwd(), 'extension');
    return await puppeteer.launch({
        headless: false,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            `--disable-extensions-except=${pathToExtension}`,
            `--load-extension=${pathToExtension}`,
        ],
    });
}

function generateRandomPassword(length) {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let password = "";

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        password += charset.charAt(randomIndex);
    }
    return password;
}

async function loginFacebook(browser, accountsPath, accountsData) {
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
    await new Promise(resolve => setTimeout(resolve, 3000));
    let currentUrl = facebookPage.url();
    let i = 0;
    while (i < 9) {
        if (currentUrl.includes('checkpoint')) {
            const newPassword = await facebookPage.$('input[name="password_new"]');
            if (newPassword) {
                const newPass = generateRandomPassword(10);
                await facebookPage.type('input[name="password_new"]', newPass);
                await facebookPage.click('input[type="submit"]');
                await new Promise(resolve => setTimeout(resolve, 2000));
                const rawData = fs.readFileSync(accountsPath);
                const jsonData = JSON.parse(rawData);
                jsonData.facebook_password = newPass;
                const updatedData = JSON.stringify(jsonData, null, 2);
                fs.writeFileSync(accountsPath, updatedData);
            } else if (i == 8) {
                const rawData = fs.readFileSync(accountsPath);
                const jsonData = JSON.parse(rawData);
                jsonData.facebook_username = 'checkpoint';
                jsonData.facebook_password = 'checkpoint';
                jsonData.facebook_2fa = 'checkpoint';
                const updatedData = JSON.stringify(jsonData, null, 2);
                fs.writeFileSync(accountsPath, updatedData);
                break;
            } else {
                await new Promise(resolve => setTimeout(resolve, 200));
                await facebookPage.click('input[type="submit"]');
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
            currentUrl = facebookPage.url();
            i++;
        } else {
            break;
        }
    }
}
async function loginAds(browser, accountsData) {
    try {
        const pages = await browser.pages();
        const adsPage = pages.length > 0 ? pages[0] : await browser.newPage();
        await adsPage.goto('https://dashboard.smit.vn/');
        await adsPage.waitForSelector('#username');
        await adsPage.type('#username', accountsData.ads_username);
        await adsPage.type('#password', accountsData.ads_password);
        await adsPage.keyboard.press('Enter');
        await adsPage.waitForNavigation();
        return adsPage
    } catch (error) {}
}
async function reloadPixelData(adsPage) {
    try {
        await adsPage.goto('https://adscheck.smit.vn/app/share-pixel');
        const buttonSelector = 'button.btn.btn-gradient.w-full.h-40.mt-15';
        await adsPage.waitForSelector(buttonSelector);
        await adsPage.click(buttonSelector);
    } catch (error) {
        await adsPage.goto('https://adscheck.smit.vn/app/share-pixel');
        const buttonSelector = 'button.btn.btn-gradient.w-full.h-40.mt-15';
        await adsPage.waitForSelector(buttonSelector);
        await adsPage.click(buttonSelector);
    }
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
            pixelData.push({
                i,
                pixelText
            });
            uniqueSet.add(pixelText);
            count++;
        }
    }
    fs.writeFileSync(jsonFilePath, JSON.stringify(pixelData, null, 2));
    await adsPage.click(toggleSharePixelSelector);
    return elements;
}
async function sharePixel(adsPage, elements, idPixel, tkqc) {
    const toggleSharePixelSelector = '.config-toggle';
    const isChecked = await adsPage.$eval('.f0441 input[type="checkbox"]', checkbox => checkbox.checked);
    if (isChecked) {
        await adsPage.click('.f0441 input[type="checkbox"]');
    } else {
        await adsPage.click('.f0441 input[type="checkbox"]');
        await adsPage.click('.f0441 input[type="checkbox"]');
    }
    await elements[idPixel].click();
    await adsPage.click(toggleSharePixelSelector);
    const textareaSelector = '.config-textarea textarea';
    const tkqcString = tkqc.toString();
    await adsPage.waitForSelector('.config-tab');
    await adsPage.waitForSelector('.config-tab');
    await adsPage.type(textareaSelector, tkqcString);
    const buttonSelector = '.btn-gradient';
    await adsPage.waitForSelector(buttonSelector);
    await adsPage.click(buttonSelector);
    await new Promise(resolve => setTimeout(resolve, 2000));
    const actionTab = await adsPage.$('.config-tab');
    await actionTab.click();
    await adsPage.focus(textareaSelector);
    await adsPage.keyboard.down('Control');
    await adsPage.keyboard.press('KeyA');
    await adsPage.keyboard.up('Control');
    await adsPage.keyboard.press('Delete');
    await adsPage.click(toggleSharePixelSelector);
    return 'Success';
}
async function closeBrowser(browser) {
    try {
        await browser.close();
    } catch (error) {
        console.error('Error closing browser:', error);
    }
}

async function initBrowser() {
    let browser;
    let adsPage;
    let elements;
    try {
        const pathToExtension = path.join(process.cwd(), 'extension');
        browser = await launchBrowser();
        const accountsPath = path.join(process.cwd(), 'data/account.json');
        const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
        await loginFacebook(browser, accountsPath, accountsData);
        adsPage = await loginAds(browser, accountsData);
        elements = await reloadPixelData(adsPage);
        return {
            browser,
            adsPage,
            elements
        };
    } catch (error) {
        console.log(error);
        await closeBrowser(browser);
        const pathToExtension = path.join(process.cwd(), 'extension');
        browser = await launchBrowser();
        const accountsPath = path.join(process.cwd(), 'data/account.json');
        const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
        await loginFacebook(browser, accountsPath, accountsData);
        adsPage = await loginAds(browser, accountsData);
        elements = await reloadPixelData(adsPage);
        return {
            browser,
            adsPage,
            elements
        };
    }
}
module.exports = {
    initBrowser,
    launchBrowser,
    loginFacebook,
    loginAds,
    reloadPixelData,
    sharePixel,
    closeBrowser,
};
