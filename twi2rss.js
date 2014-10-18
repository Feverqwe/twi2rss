#!/usr/bin/node
/*
 npm install jsdom xmlhttprequest
 */
(function() {
  var username = process.argv[2];
  var XMLHttpRequest = require('xmlhttprequest').XMLHttpRequest;

  var pageLimit = 10;
  var twiList = [];
  var twiIdList = {};

  var textParse = function (text, html) {
    var content = html;
    var youtube = text.match(/youtu.*v=([^& ]*)/);
    if (youtube) {
      content += '<br/><iframe width="560" height="315" src="{url}" frameborder="0" allowfullscreen></iframe>'.replace('{url}', 'https://www.youtube.com/embed/'+youtube[1]);
    }
    var instagram = text.match(/instagram\.com\/p\/([^/ ]*)/);
    if (instagram) {
      content += '<br/><iframe src="{url}" width="612" height="710" frameborder="0" scrolling="no" allowtransparency="true"></iframe>'.replace('{url}', 'https://instagram.com/p/'+instagram[1]+'/embed/')
    }
    return content;
  };

  var readData = function(data) {
    var twiList = [];

    var html = require("jsdom").jsdom(data).body;

    for (var i = 0, item; item = html.childNodes[i]; i++) {
      if (item.nodeType !== 1 || item.getAttribute('class') !== 'Grid') {
        continue;
      }

      var twi = {};
      var tweet = item.querySelector('.js-tweet');

      twi.time = item.querySelector('.js-short-timestamp');
      twi.html = item.querySelector('.js-tweet-text');
      twi.link = twi.time.parentNode;
      if (!twi.time || !twi.html || !twi.link || !tweet) {
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
      twi.link = 'https://twitter.com' + twi.link.getAttribute('href');

      var pic = tweet.querySelector('a.TwitterPhoto-link > img');
      if (pic) {
        twi.html += '<br/><img src="{url}" width="100%"/>'.replace('{url}', pic.getAttribute('src'));
      }
      twi.html = textParse(twi.text, twi.html);
      twiList.push(twi);
    }
    return twiList;
  };

  var get_page = function(maxId, cb) {
    var url = 'https://twitter.com/i/profiles/show/{username}/timeline'.replace('{username}', username);
    if (maxId) {
      url += '?max_id=' + maxId;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = function() {
      var data;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (e) {}
      if (!data || !data.items_html) {
        return cb();
      }
      cb(readData(data.items_html));
    };
    xhr.onerror = function() {
      cb();
    };
    xhr.send();
  };

  get_page(null, function onGotList(list) {
    list = list || [];
    var nowTime = undefined;
    var lastTime = nowTime = parseInt(Date.now() / 1000);
    var lastId = 0;
    for (var i = 0, twi; twi = list[i]; i++) {
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

  var makeFeed = function(twiList) {
    var body = ['<?xml version="1.0" ?><rss version="2.0"><channel>'];
    body.push('<title>{title}</title>'.replace('{title}', 'Twitter by ' + username));
    for (var i = 0, twi; twi = twiList[i]; i++) {
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

    console.log(body.join(''));
  };
})();
