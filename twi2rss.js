#!/usr/local/bin/node

var username = process.argv[2];
var $ = require('jQuery');
var feed = '';
var page_limit = 10;
var now_time = parseInt((new Date()).getTime() / 1000);
var get_page = function(max_id) {
	$.get('https://twitter.com/i/profiles/show/' + username + '/timeline' + ((max_id !== undefined) ? '?max_id=' + max_id : ''),
		function(data) {
			read_data(data);
		}
	);
}
get_page();
var read_data = function(data) {
	if (!data || !data.items_html) {
		make_feed([]);
		return;
	}
	var tw = [];
	var arr = $(data.items_html); //$($.parseHTML(data.items_html));
	$.each(arr, function(k, item) {
		var tw_item = {};
		var tweet = $(item).find('.tweet').eq(0);
		if (tweet.length === 0) {
			return 1;
		}
		tw_item.time = $(item).find('._timestamp').data('time');
		tw_item.is_rp = (tweet.data('is-reply-to')) ? true : false;
		tw_item.is_rt = (tweet.data('retweeter')) ? true : false;
		tw_item.html = $(item).find('.tweet-text').html();
		tw_item.text = $(item).find('.tweet-text').text();
		tw_item.user = (tw_item.is_rt) ? tweet.data('retweeter') : tweet.data('screen-name');
		tw_item.author = tweet.data('screen-name');
		tw_item.id = tweet.data('tweet-id') || tweet.data('item-id');
		tw_item.fb = tweet.data('feedback-key').replace(/.*_(.*)$/, '$1');
		tw.push(tw_item);
	});
	make_feed(tw);
};
var make_feed = function(data) {
	if (data.length === 0) {
		if (feed.length > 0) {
			write_feed();
		}
		return;
	}
	if (feed.length === 0) {
		feed = '<?xml version="1.0" ?><rss version="2.0">' + '<channel>' +
			'<title>Twitter by ' + data[0].user + '</title>';
	}
	var last_time = now_time;
	var last_id = 0;
	for (var i = 0, item; item = data[i]; i++) {
		if (last_time > item.time) {
			last_time = item.time;
			last_id = parseInt(item.fb);
		}
		if (item.is_rp) {
			continue;
		}
		var date = new Date(item.time * 1000);
		feed += '<item>';
		feed += '<title><![CDATA[' + item.user + ': ' + ((item.is_rt) ? 'RT ' + item.author + ': ' : '') + item.text + ']]></title>';
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
}