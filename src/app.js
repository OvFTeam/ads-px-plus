
const modules = require('./modules');
const fs = require('fs');
const path = require('path');
(async () => {
    const browser = await modules.launchBrowser();
    const accountsPath = path.join(process.cwd(), 'data/account.json');
    const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
    await modules.loginFacebook(browser, accountsData, accountsPath);
    const { adsPage, pixelData } = await modules.loginAds(browser, accountsData);
    await modules.reloadPixelData(adsPage);
})();
