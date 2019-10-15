require('dotenv').config();
const fs = require('fs-extra');
const { join } = require('path');
const mysql = require('mysql');

const SQL_CATEGORIES =
  `SELECT title, pictureCaption, titleExtension, 1 as sequence, 'article' as contentType
   FROM categories
   WHERE fileName=?`;

const SQL_PAGES =
  `SELECT title, '' as pictureCaption, '' as titleExtension, \`order\` as sequence, 'article-page' as contentType
   FROM pages
   WHERE fileName=?`;

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_DATABASE
});

const subDirectories = p => fs.readdirSync(p).filter(f => fs.statSync(join(p, f)).isDirectory());
const filesInDirectory = p => fs.readdirSync(p).filter(f => fs.statSync(join(p, f)).isFile());
const getNameFromPath = p => p.substring(p.lastIndexOf('/') + 1);
const fileNameWithoutExtension = f => f.substring(0, f.lastIndexOf('.'));

const processDir = (dirPath) => {
  for (const subDir of subDirectories(dirPath)) {
    processDir(join(dirPath, subDir));
  }

  renameIncToHtml(dirPath);
  populateJsonFiles(dirPath);
};

const renameIncToHtml = (dirPath) => {
  for (const childFile of filesInDirectory(dirPath)) {
    if (childFile.includes('.inc') || childFile.includes('_')) {
      const updatedName = cleanIdentifier(childFile);
      console.log(dirPath, '---', updatedName);

      const dirName = getNameFromPath(dirPath);
      if (dirName + '.html' === updatedName) {
        // Create json file in current directory, rename html file
        fs.ensureFileSync(join(dirPath, dirName + '.json'));
        fs.moveSync(join(dirPath, childFile), join(dirPath, updatedName));
      } else {
        // Create new directory with JSON file, move the html file
        const fileName = fileNameWithoutExtension(updatedName);
        fs.ensureFileSync(join(dirPath, fileName, fileName + '.json'));
        fs.moveSync(join(dirPath, childFile), join(dirPath, fileName, updatedName));
      }
    }
  }
};

const populateJsonFiles = (dirPath) => {
  for (const childFile of filesInDirectory(dirPath)) {
    if (childFile.endsWith('.json')) {
      console.log(join(dirPath, childFile));
      const identifier = reverseCleanIdentifier(fileNameWithoutExtension(childFile));

      queryToJson(SQL_CATEGORIES, identifier, join(dirPath, childFile));
      queryToJson(SQL_PAGES, identifier, join(dirPath, childFile));
    }
  }
};

const queryToJson = (query, identifier, jsonPath) => {
  connection.query(query, [identifier], (error, categories, fields) => {    if (error) {
      return console.error(error.message);
    }

    for (const category of categories) {
      const title = category.title;
      const description = category.titleExtension ? `${title} - ${category.titleExtension}` : title;
      const jsonObject = {
        title: category.title,
        description,
        sequence: category.sequence,
        contentType: category.contentType,
        keywords: ['Poland', 'travel']
      };

      if (category.pictureCaption) {
        jsonObject.imageDescription = category.pictureCaption;
      }

      fs.outputJson(jsonPath, jsonObject, {spaces: 2});
    }
  });
};

const cleanIdentifier = (identifier) => {
  return identifier.replace(/_/g, '-').replace(/.inc/g, '.html');
};

const reverseCleanIdentifier = (identifier) => {
  return identifier.replace(/-/g, '_').replace(/.inc/g, '.html');
};

const rootDir = process.env.DIR_INPUT;
processDir(rootDir);
