const puppeteer = require('puppeteer');
const { Sequelize, DataTypes } = require('sequelize');

// Set up Sequelize connection
const sequelize = new Sequelize('transfert_datascraping_disway', 'root', null, {
    host: 'localhost',
    dialect: 'mysql',
});

// Define Sequelize model for ScrapedData
const ScrapedData = sequelize.define('ScrapedData', {
    title: DataTypes.STRING,
    price: DataTypes.STRING,
    description: DataTypes.TEXT,
    image: DataTypes.STRING,
    fichetechnique: DataTypes.TEXT,
    link: DataTypes.STRING,
});

async function scrapePages() {
    try {
    const baseUrl = 'https://www.disway.com/allproducts/?view-mode=grid';
    const totalPages = 154;
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(60000);

    let results = [];
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const url = baseUrl + pageNum;
    await page.goto(url);
    const data = await page.evaluate(() => {
        let items = document.querySelectorAll('.PLP_item');
        let pageResults = [];

        items.forEach((item) => {
        pageResults.push({
            link: item.querySelector('.PLP_product-title')?.href || null,
        });
        });

        return pageResults;
    });

    results = results.concat(data);
    }

    for (let i = 0; i < results.length; i++) {
    const link = results[i].link;

    if (link) {
        await page.goto(link);

        const productData = await page.evaluate(() => {
        let title = document.querySelector('h1')?.innerText || null;
        let price = document.querySelector('.Details_item-number-body')?.innerText || null;
        let description = document.querySelector('.Details_description')?.innerText || null;
        let fichetechnique = document.querySelector('.Details_table-list')?.innerText || null;
        let image = document.querySelector('.MediaGallery_media-gallery img')?.getAttribute('src') || null;

        return {
            title,
            price,
            description,
            image,
            fichetechnique,
        };
        });

        results[i] = { ...results[i], ...productData }; // Merge the scraped data

        // Save the scraped data to the database using Sequelize
        await ScrapedData.create(results[i]);

        console.log('Scraped:', results[i]);
        }
    }

    console.log('All data scraped:', results);

    // Close the Puppeteer browser and Sequelize connection
    await browser.close();
    await sequelize.close();
    } catch (error) {
    console.error(error);
    }
}

scrapePages();
