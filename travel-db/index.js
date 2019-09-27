require('dotenv').config();
const mysql = require('mysql');
const fs = require('fs-extra');

const SQL_CHILD_CATEGORIES =
  `SELECT c.id, c.fileName, c.title, c.pictureCaption, c.category_text, cc.child_order 
   FROM categories c, categories_and_categories cc 
   WHERE c.id=cc.child_id AND cc.parent_id=?`;
const SQL_CHILD_PAGES =
  `SELECT p.id, p.title, p.page_text, p.fileName, p.page_order 
   FROM pages p 
   WHERE p.category_id=?`;

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE
});

const rootDir = process.env.DIR_OUTPUT;
if (rootDir) {
  fs.removeSync(rootDir);
}

const processCategory = (categoryId, parents) => {
  connection.query(SQL_CHILD_CATEGORIES, [categoryId], (error, childCategories, fields) => {
    if (error) {
      return console.error(error.message);
    }

    for (const childCategory of childCategories) {
      const identifier = childCategory.fileName.replace(/_/g, '-');
      console.log(`Category ${identifier}: ${childCategory.title} (${childCategory.child_order})`);

      const newParents = parents.slice(0);
      newParents.push(identifier);

      const dirPath = newParents.join('/');
      const categoryContent = cleanContentText(childCategory.category_text);
      const categoryObject = {
        title: childCategory.title,
        description: childCategory.title,
        sequence: childCategory.child_order,
        contentType: 'article',
        keywords: ['Turkey', 'Travel', 'vacation'],
        imageDescription: childCategory.pictureCaption
      };

      fs.outputFile(`${dirPath}/${identifier}.html`, categoryContent);
      fs.outputJson(`${dirPath}/${identifier}.json`, categoryObject, {spaces: 2});

      processCategory(childCategory.id, newParents);
      processCategoryPages(childCategory.id, newParents);
    }
  });
};

const processCategoryPages = (categoryId, parents) => {
  connection.query(SQL_CHILD_PAGES, [categoryId], (error, pages, fields) => {
    if (error) {
      return console.error(error.message);
    }

    for (const page of pages) {
      const identifier = page.fileName.replace(/_/g, '-');
      console.log(`Page ${identifier}: ${page.title} (${page.page_order})`);

      const newParents = parents.slice(0);
      newParents.push(identifier);

      const dirPath = newParents.join('/');
      const pageContent = cleanContentText(page.page_text);
      const pageObject = {
        title: page.title,
        description: page.title,
        sequence: page.page_order,
        contentType: 'article-page',
        keywords: []
      };

      fs.outputFile(`${dirPath}/${identifier}.html`, pageContent);
      fs.outputJson(`${dirPath}/${identifier}.json`, pageObject, {spaces: 2});
    }
  });
};

const cleanContentText = (text) => {
  return text.replace('<font class="first_letter">', '')
    .replace('</font>', '')
    .replace(/<br\/>/g, '<br>')
    .replace(/`/g, `'`);
};

processCategory(0, [rootDir]);
