/* eslint-disable no-undef */
// To generate the processors page and RSS feed, update data.json and run:
// bun run scripts/subprocessors/generate.js
const dataPath = './scripts/subprocessors/data.json';
const templatePath = './scripts/subprocessors/template.mdx';
const pageOutputPath = './pages/legal/subprocessors/index.mdx';
const feedOutputPath = './pages/legal/subprocessors/rss.xml.tsx';

const now = new Date();
const utcString = now.toUTCString();

const getCurrentDateString = (date) => {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const day = date.getDate();
  const monthIndex = date.getMonth();
  const year = date.getFullYear();

  return monthNames[monthIndex] + ' ' + day + ', ' + year;
};

// Page

const templateContent = await Bun.file(templatePath).text();

const data = await Bun.file(dataPath).json();
const table = `| Name | Nature of processing | Country|
| -------- | -------- |  -------- |
${data.subprocessors
  .map((p) => {
    return `| ${p.name} | ${p.description} | ${p.country} |`;
  })
  .join('\n')}
`;

const pageContent = templateContent
  .replace('{{TABLE}}', table)
  .replace('{{LAST_UPDATED}}', getCurrentDateString(now));

await Bun.write(pageOutputPath, pageContent);

// RSS feed

const feed = `<?xml version="1.0" encoding="utf-8"?>
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
    <channel>
      <title>Markprompt Subprocessors</title>
      <link>https://markprompt.com</link>
      <description>Current Markprompt Subprocessors are published here</description>
      <pubDate>${utcString}</pubDate>
      <atom:link href="https://markprompt/legal/subprocessors/rss.xml" rel="self" type="application/rss+xml"/>
      ${data.subprocessors
        .map((p) => {
          return `<item>
            <title>${p.name}</title>
            <link>https://markprompt.com/legal/subprocessors</link>
            <guid>https://markprompt.com/legal/subprocessors</guid>
            <description>${p.description}</description>
            <pubDate>${utcString}</pubDate>
          </item>`;
        })
        .join('\n')}
    </channel>
  </rss>`
  .replace(/\n+/gi, '')
  .replace(/\s{2,}/gi, '');

const feedPage = `import { NextPageContext } from 'next';
import { Component } from 'react';

class Sitemap extends Component {
  static async getInitialProps({ res }: NextPageContext) {
    res?.setHeader('Content-Type', 'text/xml');
    res?.write(
      \`${feed}\`,
    );
    res?.end();
  }
}

export default Sitemap;
`;

await Bun.write(feedOutputPath, feedPage);
