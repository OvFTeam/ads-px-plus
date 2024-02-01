const express = require('express');
const fs = require('fs');
const path = require('path');
const modules = require('./modules');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

let browser;
let adsPage;
let elements;

(async () => {
    ({ browser, adsPage, elements } = await modules.initBrowser());
})();
app.get('/', (req, res) => {
    const jsonData = JSON.parse(fs.readFileSync('data/account.json', 'utf-8'));
    const credentialsData = JSON.parse(fs.readFileSync('data/credentials.json', 'utf-8'));
    res.render('client', { data: jsonData, clientData: credentialsData });
});

app.get('/admin', (req, res) => {
    const jsonData = JSON.parse(fs.readFileSync('data/account.json', 'utf-8'));
    const pixelsData = JSON.parse(fs.readFileSync('data/pixels.json', 'utf-8'));
    const credentialsData = JSON.parse(fs.readFileSync('data/credentials.json', 'utf-8'));
    res.render('admin', { data: jsonData, pixelData: pixelsData, adminData: credentialsData });
});

app.get('/reloadPixels', async (req, res) => {
    const pathToExtension = path.join(process.cwd(), 'extension');
    await modules.closeBrowser(browser);
    browser = await modules.launchBrowser();
    const accountsPath = path.join(process.cwd(), 'data/account.json');
    const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
    await modules.loginFacebook(browser, accountsPath, accountsData);
    adsPage = await modules.loginAds(browser, accountsData);
    elements = await modules.reloadPixelData(adsPage);
    res.redirect('/admin');
});

app.post('/update', (req, res) => {
    const jsonData = JSON.parse(fs.readFileSync('data/account.json', 'utf-8'));
    jsonData.ads_username = req.body.ads_username;
    jsonData.ads_password = req.body.ads_password;
    jsonData.facebook_username = req.body.facebook_username;
    jsonData.facebook_password = req.body.facebook_password;
    jsonData.facebook_2fa = req.body.facebook_2fa;
    jsonData.id_pixel = req.body.id_pixel;
    fs.writeFileSync('data/account.json', JSON.stringify(jsonData, null, 2));
    res.redirect('/admin');
});
app.post('/update-password', (req, res) => {
    const jsonDataPath = 'data/credentials.json';
    const credentialsData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf-8'));
    credentialsData.clientUsername = req.body.client_username;
    credentialsData.clientPassword = req.body.client_password;
    credentialsData.adminUsername = req.body.admin_username;
    credentialsData.adminPassword = req.body.admin_password;
    fs.writeFileSync(jsonDataPath, JSON.stringify(credentialsData, null, 2));
    res.redirect('/admin');
});

let lastPushTime = 0;
const minTimeBetweenPushes = 12 * 1000;
app.post('/push', async (req, res) => {
    const currentTime = new Date().getTime();
    if (currentTime - lastPushTime < minTimeBetweenPushes) {
        res.header('Content-Type', 'application/json').send(JSON.stringify({ result: 'Fail' }));
        return;
    }
    lastPushTime = currentTime;
    let tkqc = req.body.tkqc;
    let idPixelData = JSON.parse(fs.readFileSync('data/account.json', 'utf-8'));
    let idPixel = idPixelData.id_pixel;
    try {
        const response = await modules.sharePixel(adsPage, elements, idPixel, tkqc);
        if (response === 'Success') {
            res.header('Content-Type', 'application/json').send(JSON.stringify({ result: 'Success' }));
        } else {
            res.header('Content-Type', 'application/json').send(JSON.stringify({ result: 'Fail' }));
        }
    } catch (error) {
        console.error(error);
        res.status(500).header('Content-Type', 'application/json').send(JSON.stringify({ result: 'Internal Server Error' }));
    }
});
app.listen(process.env.PORT || 3000,
    () => console.log("Server is running in port", process.env.PORT || 3000));