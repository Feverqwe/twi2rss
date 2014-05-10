#!/usr/local/bin/node

var username = process.argv[2];
var $ = require('jQuery');
var feed = '<?xml version="1.0" ?><rss version="2.0"><channel><title>Twitter by ' + username + '</title>';
var page_limit = 10;
var now_time = parseInt((new Date()).getTime() / 1000);
var get_page = function(max_id) {
	$.get('https://twitter.com/i/profiles/show/' + username + '/timeline' + ((max_id !== undefined) ? '?max_id=' + max_id : ''),
		function(data) {
			read_data(data);
		}
	);
};
get_page();
var text_parse = function (text, html) {
	var content = html;
	var youtube = text.replace(/.*youtu.*v=([^&]*).*/, '$1');
	if (youtube !== text) {
		content += '<br/><iframe width="560" height="315" src="//www.youtube.com/embed/'+youtube+'" frameborder="0" allowfullscreen></iframe>';
	}
	var instagram = text.replace(/.*instagram\.com\/p\/([^/ ]*).*/,'$1');
	if (instagram !== text) {
		content += '<br/><iframe src="//instagram.com/p/'+instagram+'/embed/" width="612" height="710" frameborder="0" scrolling="no" allowtransparency="true"></iframe>'
	}
	return content;
};
var read_data = function(data) {
	var tw = [];
	if (!data || !data.items_html) {
		make_feed(tw);
		return;
	}
	var arr = $(data.items_html); //$($.parseHTML(data.items_html));
	$.each(arr, function(k, item) {
		var tw_item = {};
		var $item = $(item);
		var tweet = $item.find('.tweet').eq(0);
		var type = 0;
		if (tweet.length === 0) {
			tweet = $item.find('.js-tweet').eq(0);
			type = 1;
		}
		if (tweet.length === 0) {
			return 1;
		}
		if (type === 0) {
			tw_item.time = $item.find('._timestamp').data('time');
			tw_item.is_rp = (tweet.data('is-reply-to')) ? true : false;
			tw_item.is_rt = (tweet.data('retweeter')) ? true : false;
			tw_item.html = $item.find('.tweet-text').html();
			tw_item.text = $item.find('.tweet-text').text();
			tw_item.user = (tw_item.is_rt) ? tweet.data('retweeter') : tweet.data('screen-name');
			tw_item.author = tweet.data('screen-name');
			tw_item.id = tweet.data('tweet-id') || tweet.data('item-id');
			tw_item.fb = tweet.data('feedback-key').replace(/.*_(.*)$/, '$1');
			var pic = tweet.find('a.is-preview > div.is-preview > div');
			if (pic.length > 0) {
				tw_item.html += '<br/><img src="'+pic.data('img-src')+'" width="100%" style="'+pic.attr('style')+'"/>';
			}
		} else {
			tw_item.time = $item.find('.js-short-timestamp').data('time');
			tw_item.is_rp = (tweet.data('is-reply-to')) ? true : false;
			tw_item.is_rt = (tweet.data('retweeter')) ? true : false;
			tw_item.html = $item.find('.js-tweet-text').html();
			tw_item.text = $item.find('.js-tweet-text').text();
			tw_item.user = (tw_item.is_rt) ? tweet.data('retweeter') : tweet.data('screen-name');
			tw_item.author = tweet.data('screen-name');
			tw_item.id = tweet.data('tweet-id') || tweet.data('item-id');
			tw_item.fb = tweet.data('feedback-key').replace(/.*_(.*)$/, '$1');
			var pic = tweet.find('a.TwitterPhoto-link > img');
			if (pic.length > 0) {
				tw_item.html += '<br/><img src="'+pic.attr('src')+'" width="100%" style="'+pic.attr('style')+'"/>';
			}
		}
		tw_item.html = text_parse(tw_item.text, tw_item.html);
		tw.push(tw_item);
	});
	make_feed(tw);
};
var make_feed = function(data) {
	if (data.length === 0) {
		write_feed();
		return;
	}
	var last_time = now_time;
	var last_id = 0;
	for (var i = 0, item; item = data[i]; i++) {
		if (last_time > item.time) {
			last_time = item.time;
			last_id = parseInt(item.fb);
		}
		if (item.is_rp || !item.text) {
			continue;
		}
		var date = new Date(item.time * 1000);
		feed += '<item>';
		feed += '<title><![CDATA[' + item.user + ': ' + ((item.is_rt) ? 'RT ' : '') + item.text.replace(/\r?\n/g,' ') + ']]></title>';
		feed += '<link><![CDATA[https://twitter.com/_/status/' + item.fb + ']]></link>';
		feed += '<description><![CDATA[' + item.html + ']]></description>';
		feed += '<pubDate>' + date.toGMTString() + '</pubDate>';
		feed += '<guid>' + item.id + '</guid>';
		feed += '<author>' + item.author + '</author>';
		feed += '</item>';
	}
	page_limit--;
	if (now_time - 12 * 60 * 60 < last_time && last_id > 0 && page_limit > 0) {
		get_page(last_id - 1);
	} else {
		write_feed();
	}
};
var write_feed = function() {
	feed += '</channel>' + '</rss>';
	console.log(feed);
};
