#!/usr/local/bin/node
var username = process.argv[2];
var $ = require('jQuery');
$.get('https://twitter.com/i/profiles/show/'+username+'/timeline',
	function(data) {
		if (!data || !data.items_html) {
			return;
		}
		read_data(data);
	}
);
var read_data = function(data) {
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
		if (tw_item.is_rp) {
			return 1;
		}
		tw_item.is_rt = (tweet.data('retweeter')) ? true : false;
		tw_item.html = $(item).find('.tweet-text').html();
		tw_item.text = $(item).find('.tweet-text').text();
		tw_item.user = (tw_item.is_rt)?tweet.data('retweeter'):tweet.data('screen-name');
		tw_item.author = tweet.data('screen-name');
		tw_item.id = tweet.data('tweet-id') || tweet.data('item-id');
		tw_item.fb = tweet.data('feedback-key').replace(/.*_(.*)$/, '$1');
		tw.push(tw_item);
	});
	make_feed(tw);
};
var make_feed = function(data) {
	if (data.length === 0) {
		return;
	}
	var feed = '<?xml version="1.0" ?><rss version="2.0">'+'<channel>'+
'<title>Twitter by '+data[0].user+'</title>';
	for (var i = 0, item; item = data[i]; i++) {
		var date = new Date(item.time * 1000);
		feed+='<item>';
		feed+='<title><![CDATA['+item.user+': '+((item.is_rt)?'RT '+item.author+': ':'')+item.text+']]></title>';
		feed+='<link><![CDATA[https://twitter.com/_/status/'+item.fb+']]></link>';
		feed+='<description><![CDATA['+item.html+']]></description>';
		feed+='<pubDate>'+date.toGMTString()+'</pubDate>';
		feed+='<guid>'+item.id+'</guid>';
		feed+='<author>'+item.author+'</author>';
		feed+='</item>';
	}
	feed+='</channel>'+'</rss>';
	console.log(feed);
};