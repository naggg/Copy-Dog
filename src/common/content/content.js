/*
 * ページのタイトルとURLをクリップボードにコピーする
 */
function copyPageInfo(e){
	
	// URL
	var url = extractURL();
	var title = extractTitle();
	var date = extractDate();
	var author = extractAuthor();
	var image = extractImage();

	// 対象文字列
	var data = [title, url, date, author, image].join("\n");

	// コピペの実行、結果を backgrond.js に戻して、通知する
	navigator.clipboard.writeText(data)
	.then(() => {
		notifyExtension({result: "success", message: data});
	})
	.catch(err => {
		notifyExtension({result: "error", message: "ユーザが拒否、もしくはなんらかの理由で失敗しました。"});
	});


	/**
	 * ページURLを取得する
	 * @returns URL
	 */
	function extractURL(){
		var url = window.location.href;		
		// トラッキングパラメータの除去
		url = removeTrackingParams(url);
		// Amazonの場合は、URLを短縮化
		if(url.match(/amazon\.co\.jp/)) url = url.replace(/https:\/\/www\.amazon\.co\.jp\/.*\/dp\/([A-Z0-9]+).*$/, 'https://www.amazon.co.jp/dp/$1/');
		return url;
	}

	/**
	 * URLからトラッキングパラメータを除去する
	 * @param {string} url - 元のURL
	 * @returns {string} トラッキングパラメータを除去したURL
	 */
	function removeTrackingParams(url){
		try {
			var urlObj = new URL(url);
			var params = urlObj.searchParams;
			
			// トラッキングパラメータの除去
			var trackingParams = [
				'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
				'fbclid', 'gclid', 'gbraid', 'wbraid', 'dclid', 'msclkid', 'twclid', 'ttclid', 'mc_cid', 'mc_eid'
			];
			for(var i=0; i<trackingParams.length; i++){
				params.delete(trackingParams[i]);
			}
			
			// 新しいURLを構築
			var newUrl = urlObj.origin + urlObj.pathname;
			var newSearch = params.toString();
			if(newSearch){
				newUrl += '?' + newSearch;
			}
			if(urlObj.hash){
				newUrl += urlObj.hash;
			}			
			return newUrl;
		}catch(e){
			// URLの解析に失敗した場合は、元のURLを返す
			return url;
		}
	}

	/**
	 * ページタイトルを取得する
	 * @returns ページタイトル
	 */
	function extractTitle(){
		return document.title;
	}

	/**
	 * ページ日時を取得する
	 * @returns ページ日時
	 */
	function extractDate(){
		// article:published_time
		var meta = document.querySelector('meta[property="article:published_time"]');
		if(meta && meta.content) return meta.content;

		// JSON-LDからdatePublished
		var jsonLdList = getAllJsonLd();
		for(var i = 0; i < jsonLdList.length; i++){
			if(jsonLdList[i] && jsonLdList[i].datePublished){
				return jsonLdList[i].datePublished;
			}
		}

		// time datetime
		var time = document.querySelector('time[datetime]');
		if(time && time.getAttribute('datetime')) return time.getAttribute('datetime');

		// article:modified_time
		meta = document.querySelector('meta[property="article:modified_time"]');
		if(meta && meta.content) return meta.content;

		// JSON-LDからdateModified
		for(var i=0; i<jsonLdList.length; i++){
			if(jsonLdList[i] && jsonLdList[i].dateModified){
				return jsonLdList[i].dateModified;
			}
		}

		// og:updated_time
		meta = document.querySelector('meta[property="og:updated_time"]');
		if(meta && meta.content) return meta.content;

		return "";
	}

	/**
	 * 著者を取得する
	 * @returns 著者
	 */
	function extractAuthor(){
		console.log("extractAuthor");
		// meta name="author"
		var meta = document.querySelector('meta[name="author"]');
		if(meta && meta.content) return meta.content;
		console.log("meta.content1");
		// meta name="writer"
		meta = document.querySelector('meta[name="writer"]');
		if(meta && meta.content) return meta.content;
		console.log("meta.content2");
		// JSON-LDからauthor
		var jsonLdList = getAllJsonLd();
		for(var i=0; i<jsonLdList.length; i++){
			var jsonLd = jsonLdList[i];
			console.log(jsonLd);
			if(jsonLd && jsonLd.author){
				if(typeof jsonLd.author === 'string'){
					console.log("jsonLd.author");
					return jsonLd.author;
				} else if(jsonLd.author.name){
					console.log("jsonLd.author.name");
					return jsonLd.author.name;
				} else if(Array.isArray(jsonLd.author) && jsonLd.author.length > 0){
					console.log("jsonLd.author[0]");
					var firstAuthor = jsonLd.author[0];
					return typeof firstAuthor === 'string' ? firstAuthor : firstAuthor.name;
				}
			}
		}

		// link rel="author"
		var link = document.querySelector('link[rel="author"]');
		if(link && link.href) return link.href;

		return "";
	}

	/**
	 * 画像を取得する
	 * @returns 画像URL
	 */
	function extractImage(){
		var imageUrl = "";

		// og:image
		var meta = document.querySelector('meta[property="og:image"]');
		if(meta && meta.content){
			imageUrl = meta.content;
		}else{
			// twitter:image
			meta = document.querySelector('meta[name="twitter:image"]');
			if(meta && meta.content){
				imageUrl = meta.content;
			}else{
				// body内の最初のimg
				var img = document.querySelector('body img[src]');
				if(img && img.src){
					imageUrl = img.src;
				}
			}
		}

		if(!imageUrl) return "";

		// 絶対パスの処理
		if(imageUrl.startsWith("/")){
			var urlObj = new URL(url);
			imageUrl = urlObj.protocol + "//" + urlObj.host + imageUrl;
		} else if(imageUrl.startsWith("//")){
			var urlObj = new URL(url);
			imageUrl = urlObj.protocol + imageUrl;
		}

		return imageUrl;
	}

	/**
	 * すべてのJSON-LDデータを取得する
	 * @returns JSON-LDオブジェクトの配列
	 */
	function getAllJsonLd(){
		var result = [];
		var scripts = document.querySelectorAll('script[type="application/ld+json"]');
		for(var i=0; i<scripts.length; i++){
			try{
				var data = JSON.parse(scripts[i].textContent);
				// @graphプロパティを持つオブジェクトの場合
				if(data && typeof data === 'object' && !Array.isArray(data) && data['@graph'] && Array.isArray(data['@graph'])){
					for(var j=0; j<data['@graph'].length; j++){
						if(data['@graph'][j]) result.push(data['@graph'][j]);
					}
				}
				// 配列の場合
				else if(Array.isArray(data)){
					for(var j=0; j<data.length; j++){
						if(data[j]) result.push(data[j]);
					}
				}
				// その他のオブジェクトの場合
				else if(data){
					result.push(data);
				}
			}catch(e){
				continue;
			}
		}
		return result;
	}
	
}


/*
 * 通知する
 */
function notifyExtension(data){
	browser.runtime.sendMessage(data);
}
