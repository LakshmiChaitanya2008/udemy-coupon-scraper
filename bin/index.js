#! /usr/bin/env node
import puppeteer from "puppeteer";
import axios from "axios";
import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";
import figlet from "figlet";
import gradient from "gradient-string";

/*
  Sources:
  1. Udemy Freebies
  2. Tutorial Bar
  3. Real Discount
  4. IDownloadCoupon
  5. CourseVania
  6. E-Next
*/

class CourseScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: false,
    });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 1280, height: 720 });
  }

  async close() {
    await this.browser.close();
  }

  async getCoursesFromUF() {
    await this.page.goto("https://www.udemyfreebies.com/free-udemy-courses/");

    const courses = await this.page.evaluate(() =>
      [...document.querySelectorAll(".row .theme-block")].map((d) => ({
        link: d.querySelector("a.theme-img").href,
        title: d.querySelector("h4").textContent,
        category: d.querySelector(".coupon-specility").textContent,
      }))
    );

    const coupons = courses.map((c) => ({
      ...c,
      link: `https://www.udemyfreebies.com/out/${c.link.split("/").at(-1)}`,
    }));

    return coupons;
  }

  async getCoursesFromTB() {
    await this.page.goto("https://www.tutorialbar.com/all-courses/");

    const courses = await this.page.evaluate(() =>
      [
        ...document.querySelectorAll(
          ".content_constructor.pb0.pr20.pl20.mobilepadding"
        ),
      ].map((d) => ({
        link: d.querySelector(
          ".mb15.mt0.font110.mobfont100.fontnormal.lineheight20 a"
        ).href,
        title: d.querySelector(
          ".mb15.mt0.font110.mobfont100.fontnormal.lineheight20 a"
        ).textContent,
        category: d.querySelector(".cat_link_meta .cat").textContent,
      }))
    );

    for (const c of courses) {
      await this.page.goto(c.link);
      const text = await this.page.evaluate(
        () => document.querySelector("a.btn_offer_block.re_track_btn").href
      );
      c.link = text;
    }

    return courses;
  }

  async getCoursesFromRD() {
    const { data } = await axios.get(
      "https://www.real.discount/api-web/all-courses/?store=Udemy&page=1&per_page=40&orderby=date&free=1&editorschoices=0"
    );

    const coupons = data.results.map((c) => ({
      link: c.url,
      title: c.name,
      category: c.category,
    }));

    return coupons;
  }

  async getCoursesFromDC() {
    await this.page.goto("https://idownloadcoupon.com/");

    const courses = await this.page.evaluate(() =>
      [...document.querySelectorAll(".product")].map((p) => ({
        title: p.querySelector("h2").textContent,
        link: p.querySelector("a.button.product_type_external").href,
      }))
    );

    return courses;
  }

  async getCoursesFromCV() {
    await this.page.goto("https://coursevania.com/");

    const courses = await this.page.evaluate(() =>
      [...document.querySelectorAll(".stm_lms_courses__single--inner")].map(
        (d) => ({
          title: d.querySelector(".stm_lms_courses__single--title").textContent,
          link: d.querySelector("a").href,
          category: d.querySelector(".stm_lms_courses__single--term")
            .textContent,
        })
      )
    );

    for (const c of courses) {
      await this.page.goto(c.link);
      const text = await this.page.evaluate(
        () =>
          document.querySelector(
            "a.btn.btn-default.btn_big.text-center.no-price"
          ).href
      );
      c.link = text;
    }

    return courses;
  }

  async getCoursesFromEN() {
    const data = await axios.get(
      "https://jobs.e-next.in/public/assets/data/udemy.json"
    );

    const courses = data.data.map((c) => ({
      link: `https://www.udemy.com/course/${c.url}/?couponCode=${c.code}`,
      title: c.title,
      category: c.category,
    }));

    return courses;
  }

  removeDuplicates(courses) {
    const map = new Map();

    for (const item of courses) {
      map.set(item.title, item);
    }

    return Array.from(map.values());
  }

  searchCourse(courses, term) {
    return courses.filter((c) => {
      if (c.title) {
        if (c.title.toLowerCase().includes(term.toLowerCase())) return c;
      }
    });
  }
}

async function run() {
  figlet("Udemy Coupons!", function (err, data) {
    console.log(gradient.instagram.multiline(data));
  });

  const scraper = new CourseScraper();
  await scraper.initialize();
  const allCourses = [];

  const spinner1 = ora("Loading Coupons from Udemy Freebies!").start();
  const ufCourses = await scraper.getCoursesFromUF();
  allCourses.push(...ufCourses);
  spinner1.stop();

  const spinner2 = ora("Loading Coupons from Tutorial Bar!").start();
  const tbCourses = await scraper.getCoursesFromTB();
  allCourses.push(...tbCourses);
  spinner2.stop();

  const spinner3 = ora("Loading Coupons from Real Discount!").start();
  const rdCourses = await scraper.getCoursesFromRD();
  allCourses.push(...rdCourses);
  spinner3.stop();

  const spinner4 = ora("Loading Coupons from IDownloadCoupon").start();
  const dcCourses = await scraper.getCoursesFromDC();
  allCourses.push(...dcCourses);
  spinner4.stop();

  const spinner5 = ora("Loading Coupons from CourseVania").start();
  const cvCourses = await scraper.getCoursesFromCV();
  allCourses.push(...cvCourses);
  spinner5.stop();

  const spinner6 = ora("Loading Coupons from E-Next").start();
  const enCourses = await scraper.getCoursesFromEN();
  allCourses.push(...enCourses);
  spinner6.stop();

  const inputs = await inquirer.prompt([
    {
      name: "search_term",
      type: "input",
      message: "What course do you wanna search?",
    },
  ]);

  const filteredCourses = scraper.searchCourse(allCourses, inputs.search_term);
  console.log("------------------------------");
  filteredCourses.forEach((c) => {
    console.log(" ");
    console.log(chalk.bgMagenta("Name:"), c.title);
    console.log(" ");
    console.log(chalk.bgCyan("Coupon Code:"), c.link);
    console.log(" ");
    console.log(
      chalk.bgGreen("Category:"),
      c.category ? c.category : "Unknown"
    );
    console.log(" ");
    console.log("------------------------------");
  });

  await scraper.close();
}

run();
