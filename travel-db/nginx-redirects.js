require('dotenv').config();
const mysql = require('mysql');

const SQL_CATEGORIES = `SELECT fileName FROM categories WHERE fileName like '%\_%'`;
const SQL_PAGES = `SELECT fileName FROM pages WHERE fileName like '%\_%'`;

const CUSTOM_ARTICLE_MAPPINGS = {
  "health": "healthcare",
  "turkey_misconceptions": "misconceptions",
  "money": "turkish-money"
};

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE
});

const processCustom = () => {
  for (const oldArticleIdentifier in CUSTOM_ARTICLE_MAPPINGS) {
    console.log(`rewrite ^/${process.env.CATEGORY_PREFIX}${oldArticleIdentifier}$ /${cleanIdentifier(CUSTOM_ARTICLE_MAPPINGS[oldArticleIdentifier])} permanent;`)
  }
};

const processDatabase = (query, prefix) => {
  connection.query(query, [], (error, results, fields) => {
    if (error) {
      return console.error(error.message);
    }

    for (const result of results) {
      const identifier = result.fileName;
      if (identifier.includes('_')) {
        console.log(`rewrite ^/${prefix}${identifier}$ /${cleanIdentifier(identifier)} permanent;`);
      }
    }
  });
};

const cleanIdentifier = (identifier) => {
  return identifier.replace(/_/g, '-');
};

processCustom();
processDatabase(SQL_CATEGORIES, process.env.CATEGORY_PREFIX);
processDatabase(SQL_PAGES, process.env.PAGE_PREFIX);
