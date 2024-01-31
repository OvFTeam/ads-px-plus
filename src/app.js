const express = require('express');
const fs = require('fs');
const path = require('path');
const modules = require('./modules');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');
(async () => {
    const pathToExtension = path.join(process.cwd(), 'extension');
    const browser = await modules.launchBrowser();
    const accountsPath = path.join(process.cwd(), 'data/account.json');
    const accountsData = JSON.parse(fs.readFileSync(accountsPath, 'utf-8'));
    await modules.loginFacebook(browser,accountsPath, accountsData);
    const adsPage = await modules.loginAds(browser, accountsData);
    await modules.reloadPixelData(adsPage);
})();
const jsonData = JSON.parse(fs.readFileSync('data/account.json', 'utf-8'));
const pixelsData = JSON.parse(fs.readFileSync('data/pixels.json', 'utf-8'));
app.get('/admin', (req, res) => {
    res.render('admin', { data: jsonData, pixelData: pixelsData });
});


app.post('/update', (req, res) => {
    jsonData.ads_username = req.body.ads_username;
    jsonData.ads_password = req.body.ads_password;
    jsonData.facebook_username = req.body.facebook_username;
    jsonData.facebook_password = req.body.facebook_password;
    jsonData.facebook_2fa = req.body.facebook_2fa;
    jsonData.id_pixel = req.body.id_pixel;

    fs.writeFileSync('data/account.json', JSON.stringify(jsonData, null, 2));
    res.redirect('/admin');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
