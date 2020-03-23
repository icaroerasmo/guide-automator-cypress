const AutomatorProxy = require('./AutomatorProxy');
const puppeteer = require('puppeteer');
const md = require('markdown-it')({ html: true });
const wkhtmltopdf = require('wkhtmltopdf');

class Automator extends AutomatorProxy {

    async init() {
        const width = 1366;
        const height = 768;
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                `--window-size=${width},${height}`
            ]
        });
        this.page = await this.browser.newPage();
        this.page.setCacheEnabled(false);
        this.page.setViewport({ width: width, height: height });
        console.log("initialized");
        return this;
    }

    async close() {
        console.log("Close browser");
        await this.browser.close();
    }

    async goToPage(url) {
        console.log(`Go to page: ${url}`);
        await this.page.goto(url);
        return this;
    }

    async screenshot(selector, path) {
        if (selector) {
            console.log(`Take screenshot of: ${selector}`);
            await this.page.evaluate((selector) => {
                const dom = document.querySelector(selector);
                if (dom) {
                    dom.scrollIntoView();
                }
            }, selector);
        }
        console.log(`Save in: ${path}`);
        await this.page.screenshot({ path: path });
        return this;
    }

    async fillField(selector, content) {
        console.log(`Fill field: ${selector} = ${content}`)
        await this.page.type(selector, content);
        return this;
    }

    async submitForm(selector) {
        console.log(`Submit form: ${selector}`)
        await this.page.$eval(selector, form => form.submit());
        await this.page.waitForNavigation({ waitUntil: 'networkidle2' });
        return this;
    }

    async click(clickSelector, waitType) {
        console.log(`Click button: ${clickSelector}`)
        if(waitType){
            if(waitType === 'dom'){
                await this.page.click(clickSelector);
                await this.waitForTransitionEnd();
            } else if(waitType === 'network') {
                await this.page.click(clickSelector);
                //await this.page.waitForNavigation({waitUntil: 'load'})
            }
        } else {
            await this.page.click(clickSelector);
        }
        return this;
    }

    async waitForTransitionEnd() {
        return this.page.evaluate(() => {
            return new Promise((resolve) => {
                const onEnd = () => {
                    document.removeEventListener('transitionend', onEnd);
                    resolve();
                };
                document.addEventListener('transitionend', onEnd);
            });
        });
    }

    async makePDF(content, coverPath, cssPath, outputFilePath) {

        console.log("Save content as PDF");

        const options = {
            encoding: 'UTF-8',
            cover: coverPath,
            pageSize: 'A4',
            toc: true,
            tocHeaderText: 'Índice',
            output: outputFilePath,
            'user-style-sheet': cssPath,
            footerLeft: '[page]'
        };

        console.log('Rendering HTML');
        const html = md.render(content);

        console.log('Building PDF');

        wkhtmltopdf(html, options);
    }
}

module.exports = {
    instance() {
        return new Automator().init();
    }
}