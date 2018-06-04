#!/usr/bin/node

const fs = require('fs-extra');
const path = require('path');
const got = require('got');
const JSDOM = require("jsdom").JSDOM;

(function() {
  const username = process.argv[2];

  let pageLimit = 10;
  const twiList = [];
  const twiIdList = {};

  const textParse = function (text, html, tweet) {
    let content = html;

    const youtube = text.match(/youtu.+v=([\d\w_-]{11})/) || text.match(/youtu\.be\/([\d\w_-]{11})/);
    if (youtube) {
      content += '<br/><iframe width="560" height="315" src="{url}" frameborder="0" allowfullscreen></iframe>'.replace('{url}', 'https://www.youtube.com/embed/'+youtube[1]);
    }

    const instagram = text.match(/instagram\.com\/p\/([^/ ]+)/);
    if (instagram) {
      content += '<br/><iframe src="{url}" width="612" height="710" frameborder="0" scrolling="no" allowtransparency="true"></iframe>'.replace('{url}', 'https://instagram.com/p/'+instagram[1]+'/embed/');
    }

    const dDblPhotoList = [];
    const photoList = tweet.querySelectorAll('[data-image-url]');
    for (let i = 0, photo; photo = photoList[i]; i++) {
      const url = photo.getAttribute('data-image-url');
      if (dDblPhotoList.indexOf(url) !== -1) {
        continue;
      }
      dDblPhotoList.push(url);
      content += '<br/><img src="{url}">'.replace('{url}', url);
    }

    return content;
  };

  const readData = function(data, url) {
    const twiList = [];

    const fragment = JSDOM.fragment(data, {
      url: url
    });

    for (let i = 0, item; item = fragment.childNodes[i]; i++) {
      if (item.nodeType !== 1 || (item.getAttribute('class') || '').indexOf('stream-item') === -1) {
        continue;
      }

      const twi = {};
      const tweet = item.querySelector('.tweet');

      twi.time = item.querySelector('.js-short-timestamp');
      twi.html = item.querySelector('.js-tweet-text');
      if (!twi.time || !twi.html || !tweet) {
        continue;
      }
      twi.time = parseInt(twi.time.getAttribute('data-time'));
      twi.isReply = tweet.getAttribute('data-is-reply-to') === 'true';
      twi.isRT = tweet.getAttribute('data-retweeter');
      twi.text = twi.html.textContent;
      twi.html = twi.html.innerHTML;
      twi.author = tweet.getAttribute('data-screen-name');
      twi.user = twi.isRT || twi.author;
      twi.id = tweet.getAttribute('data-tweet-id') || tweet.getAttribute('data-item-id');
      twi.link = 'https://twitter.com' + tweet.getAttribute('data-permalink-path');
      twi.html = textParse(twi.text, twi.html, tweet);
      twiList.push(twi);
    }
    return twiList;
  };

  const get_page = function(maxId, cb) {
    let url = 'https://twitter.com/i/profiles/show/{username}/timeline'.replace('{username}', username);
    if (maxId) {
      url += '?max_position=' + maxId;
    }
    got(url, {
      json: true
    }).then(response => {
      const data = response.body;
      if (!data || !data.items_html) {
        return cb();
      }
      cb(readData(data.items_html, response.url));
    }, err => {
      cb();
    });
  };

  get_page(null, function onGotList(list) {
    list = list || [];
    let nowTime = undefined;
    let lastTime = nowTime = parseInt(Date.now() / 1000);
    let lastId = 0;
    for (let i = 0, twi; twi = list[i]; i++) {
      if (twiIdList[twi.id] !== undefined) {
        continue;
      }
      twiIdList[twi.id] = 1;
      if (twi.time < lastTime) {
        lastTime = twi.time;
        lastId = twi.id;
      }
      twiList.push(twi);
    }
    pageLimit--;
    if (nowTime - 12 * 60 * 60 < lastTime && lastId > 0 && pageLimit > 0) {
      return get_page(lastId, onGotList);
    }

    makeFeed(twiList);
  });

  const makeFeed = function(twiList) {
    const body = ['<?xml version="1.0" ?><rss version="2.0"><channel>'];
    body.push('<title>{title}</title>'.replace('{title}', 'Twitter by ' + username));
    for (let i = 0, twi; twi = twiList[i]; i++) {
      body.push('<item>');
      body.push('<title><![CDATA[' + twi.user + ': ' + ((twi.isRT) ? 'RT ' : '') + twi.text.replace(/\r?\n/g,' ') + ']]></title>');
      body.push('<link><![CDATA[' + twi.link + ']]></link>');
      body.push('<description><![CDATA[' + twi.html + ']]></description>');
      body.push('<pubDate>' + new Date(twi.time * 1000).toGMTString() + '</pubDate>');
      body.push('<guid>' + twi.id + '</guid>');
      body.push('<author>' + twi.author + '</author>');
      body.push('</item>');
    }
    body.push('</channel></rss>');

    fs.writeFile(path.join(__dirname, `${username}.xml`), body.join(''));
  };
})();