var $ = require('jQuery')
$.get('https://twitter.com/i/profiles/show/bigpodcast/timeline',
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
		var tweet = $(item).find('.tweet');
		if (tweet.length === 0) {
			return 1;
		}
		tw_item.time = $(item).find('._timestamp').data('time');
		tw_item.is_rt = (tweet.data('retweeter')) ? true : false;
		tw_item.text = $(item).find('.tweet-text').html();
		tw_item.user = (tw_item.is_rt)?tweet.data('retweeter'):tweet.data('screen-name');
		tw_item.author = tweet.data('screen-name');
		tw_item.id = tweet.data('tweet-id') || tweet.data('item-id');
		tw.push(tw_item);
	});
	make_feed(tw);
}
var make_feed = function(data) {
	if (data.length === 0) {
		return;
	}
	var feed = '<?xml version="1.0" ?><rss version="2.0">'+'<channel>'+
'<title>Twitter by '+data[0].user+'</title>';
	for (var i = 0, item; item = data[i]; i++) {
		var date = new Date(item.time * 1000);
		feed+='<item>';
		feed+='<title><![CDATA['+((item.is_rt)?'RT by '+item.author:item.author)+', id:'+item.id+']]></title>';
		feed+='<link><![CDATA[https://twitter.com/bigpodcast/statuses/'+item.id+']]></link>';
		feed+='<description><![CDATA['+item.text+']]></description>';
		feed+='<pubDate>'+date.toGMTString()+'</pubDate>';
		feed+='<guid>'+item.id+'</guid>';
		feed+='<author>'+item.author+'</author>';
		feed+='</item>';
	}
	feed+='</channel>'+'</rss>';
	console.log(feed);
}