const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const axios = require("axios");
const Logger = require('./utils/logger');

const { saveLocally } = require('./utils/fileManagement');
const { fetchImage } = require('./utils/imageFetcher');
const { saveToDatabase } = require("./utils/fileManagement");
const PAGE_NAVIGATION_TIMEOUT = 30000;
const WaitUntil = 'load';

const PUPPETEER_OPTIONS = {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.100 Safari/537.36'
    },
    ignoreHTTPSErrors: true,
    headless: true,
};

const MAX_RETRY = 5;
const proxy = "http://api.scraperapi.com?api_key=14c83cf789dc07a9ee0a715f00668dad?url="
const BASE_LINK = `https://www.firstpost.com`;
const sections = [{ subUrl: '/', maxPagination: 1 }, { subUrl: '/category/sports', maxPagination: 1 }, { subUrl: '/category/business', maxPagination: 5 }];

let BROWSER;
let headLinePge;
let detailedPage;

const SAVE_LOCAL = true;
const SAVE_MONGO = true;

const initializeScrapper = (async (attempt = 0) => {
    new Promise(async (resolve) => {
        Logger.info('initializing browser....')
        try {

            BROWSER = await puppeteer.launch(PUPPETEER_OPTIONS);
            headLinePge = await BROWSER.newPage();
            detailedPage = await BROWSER.newPage();

            Logger.info("browser initialized..");
            await fetchSections();
            resolve({ error: false });
        } catch (err) {
            Logger.error(err.message);
            Logger.info('Retrying in 2 seconds...');
            if (attempt > MAX_RETRY) {
                Logger.warn("MAX RETRY REACHED....");
                resolve({ error: false });
            }
            setTimeout(() => {
                initialize(++attempt);
            }, 2000);
        }
    })
});

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= scrollHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

const sleep = async (t) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve();
        }, t);
    })
}

const fetchSections = async (sectionIndex = 0) => {
    try {
        if (sectionIndex > sections.length - 1) {
            Logger.info('Fetched all sections');
            return setTimeout(()=>process.exit(0),5000);
        }
        const section = sections[sectionIndex];
        if (!section.subUrl) fetchSections(++sectionIndex);
        Logger.info(`Fetching section : ${section.subUrl}`);
        const maxPage = section.maxPagination || 1;
        for (let page = 1; page <= maxPage; page++) {
            Logger.info(`Fetching Page : ${page} of section ${section.subUrl}`);
            let link = BASE_LINK + section.subUrl;
            if (section.subUrl == "/category/business") {
                link = `${link}/page/${page}`;
            }
            Logger.info("Fetching: THE PAGE LINK IS : " + link);

            await headLinePge.goto(link, { waitUntil: WaitUntil, timeout: PAGE_NAVIGATION_TIMEOUT });

            await autoScroll(headLinePge);

            const headLinePgeContent = await headLinePge.content();
            if (!headLinePgeContent) continue;
            await parseHeadLinePage(headLinePgeContent, section.subUrl, page);
        }
        await fetchSections(++sectionIndex);

    } catch (err) {
        Logger.error(err.message);
        fetchSections(++sectionIndex);
    }
}

const parseHeadLinePage = async (pageContent, url, pageNo) => {
    return new Promise(async (resolve) => {
        try{

        
        $ = cheerio.load(pageContent);

        let sectionData = {};

        if (url == '/') {
            url = "news"
            sectionData['category'] = url;
        } else {
            url = url.replace("/category/", "");
            if (url == "business") url = url + "-" + pageNo;
            sectionData['category'] = url;
        }

        sectionData['posts'] = [];
        const elArray = [];


        $('.container .main-container .main-content').children(async (i, el) => {
            elArray.push(el);
        });

        for (let i = 0; i < elArray.length; i++) {
            const el = elArray[i];
            if ($(el).attr('class') == 'big-thumb') {
                temp = {}
                const subElArray = [];

                $(el).children(async (j, data) => {
                    subElArray.push(data);
                })
                for (let j = 0; j < subElArray.length; j++) {
                    let data = subElArray[j];
                    if ($(data).attr('class') == 'thumb-img') {
                        temp['link'] = $(data).attr('href');
                        let imgLink = $(data).find('img').attr("data-src");

                        if (!imgLink.includes("fplogo_placeholder")) {
                            imgLink = `https:${imgLink}`;
                        }
                        Logger.info("image link is " + imgLink);
                        temp['imgLink'] = imgLink;
                        const imgBuffer = await fetchImage(imgLink);
                        if (imgBuffer) temp['imgBuffer'] = imgBuffer;
                    } else if ($(data).attr('class') == 'title-wrap') {
                        temp['title'] = $(data).find('.main-title a').text().trim();
                        temp['briefDesc'] = $(data).find('.copy').text().trim();
                    }
                }
                let fullDesc = await fetchFullDescription(temp.link);
                temp['fullDescription'] = fullDesc;
                sectionData.posts.push(temp);
            }
        }
        if(SAVE_LOCAL){
            await saveLocally(sectionData, url);
        }
        if(SAVE_MONGO){
            await saveToDatabase(sectionData);
        }
        resolve({ error: false });
    }catch(e){
        Logger.error(e);
        resolve({error:true});
    }

    })
}

const fetchFullDescription = async (link) => {
    return new Promise(async (resolve) => {
        try{

            Logger.info("fetching detail page...");
            if (!link) return 'No description';
            await detailedPage.goto(link, { waitUntil: WaitUntil, timeout: PAGE_NAVIGATION_TIMEOUT });
            let detailPageContent = await detailedPage.content();
            const data = await scrapDetailPage(detailPageContent);
            resolve(data);
        }catch(e){
            Logger.error(e.message);
            resolve({error:true});
        }
    })

}

const scrapDetailPage = async (content) => {
    return new Promise((resolve) => {
        const $ = cheerio.load(content);
        const articleFullContent = $('body').find('.article-full-content');
        const articleDesc = $('body').find('.article-desc');
        let authorName='';
        let postDate=''
        let descArray = [];
        if (articleDesc && articleDesc!='') {
            Logger.info("articleDesc match found for detail page");
             $('.article-sect .article-details-list').children((i,el)=>{
                if(i==0){
                    authorName = $(el).text() || '';
                }else if(i==1){
                    postDate =  $(el).text() || '';
                }
                
            })
            if (authorName) authorName = filterText(authorName);
            if (postDate) postDate = filterText(postDate);
            descArray = [];

            $(".article-sect .article-desc .inner-copy").children((i, p) => {
                let para = $(p).text();
                if (para) descArray.push(filterText(para));
            })
        } else if (articleFullContent && articleFullContent!='') {
            Logger.info("articleFullContent match found for detail page")
            authorName = $('.article-sect .author-info').find(".article-by").text();
            if (authorName) authorName = filterText(authorName);
            postDate = $('.article-sect .author-info').find("span").text();
            if (postDate) postDate = filterText(postDate);
            descArray = [];

            $(".article-full-content").children((i, p) => {
                let para = $(p).text();
                if (para) descArray.push(filterText(para));
            })
        } else {
            Logger.info("No match for details page elements");
        }
        Logger.info(`authorName: ${authorName}, postDate:${postDate}`);
        resolve({ authorName, postDate, descArray });
    })

}


let filterText = (text='', replace) => {
    if (replace) {
        replace.map((value) => {
            text = text.replace(value, "");
        })
    }
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}
module.exports = { initializeScrapper };