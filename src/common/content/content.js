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
	 * @returns ページ日時（正規化済み）
	 */
	function extractDate(){
		var dateString = "";
		
		// article:published_time
		var meta = document.querySelector('meta[property="article:published_time"]');
		if(meta && meta.content) dateString = meta.content;

		// JSON-LDからdatePublished
		if(!dateString){
			var jsonLdList = getAllJsonLd();
			for(var i = 0; i < jsonLdList.length; i++){
				if(jsonLdList[i] && jsonLdList[i].datePublished){
					dateString = jsonLdList[i].datePublished;
					break;
				}
			}
		}

		// time datetime
		if(!dateString){
			var time = document.querySelector('time[datetime]');
			if(time && time.getAttribute('datetime')) dateString = time.getAttribute('datetime');
		}

		// article:modified_time
		if(!dateString){
			meta = document.querySelector('meta[property="article:modified_time"]');
			if(meta && meta.content) dateString = meta.content;
		}

		// JSON-LDからdateModified
		if(!dateString){
			var jsonLdList = getAllJsonLd();
			for(var i=0; i<jsonLdList.length; i++){
				if(jsonLdList[i] && jsonLdList[i].dateModified){
					dateString = jsonLdList[i].dateModified;
					break;
				}
			}
		}

		// og:updated_time
		if(!dateString){
			meta = document.querySelector('meta[property="og:updated_time"]');
			if(meta && meta.content) dateString = meta.content;
		}

		if(!dateString) return "";

		// 日付を正規化
		return normalizeDate(dateString);
	}

	/**
	 * 日付文字列を正規化する
	 * @param {string} dateString - 日付文字列
	 * @returns {string} 正規化された日付文字列（YYYY/MM/DD HH:mm形式）
	 */
	function normalizeDate(dateString){
		if(!dateString) return "";

		// UTCの判定（Z, +00:00, UTC）
		var isUTC = dateString.charAt(dateString.length - 1) === 'Z' || dateString.indexOf('+00:00') !== -1 || dateString.toLowerCase().indexOf('utc') !== -1;

		// Dateオブジェクトでパース
		var dateObj = new Date(dateString);
		
		// パースに失敗した場合（Invalid Date）
		if(isNaN(dateObj.getTime())){
			return dateString;
		}

		// UTCの場合、ページ言語が日本語ならJSTに変換
		if(isUTC){
			var lang = extractLang();
			if(lang === 'ja'){
				// JSTに変換（UTC+9時間）
				dateObj = new Date(dateObj.getTime() + (9 * 60 * 60 * 1000));
			}
		}
		// タイムゾーン指定がある場合は、そのタイムゾーンを採用（Dateオブジェクトが既に処理済み）

		// YYYY/MM/DD HH:mm形式にフォーマット
		var year = dateObj.getFullYear();
		var month = dateObj.getMonth() + 1;
		var day = dateObj.getDate();
		var hours = dateObj.getHours();
		var minutes = dateObj.getMinutes();

		// 2桁にゼロパディング（padStartの代替）
		month = (month < 10 ? '0' : '') + month;
		day = (day < 10 ? '0' : '') + day;
		hours = (hours < 10 ? '0' : '') + hours;
		minutes = (minutes < 10 ? '0' : '') + minutes;

		return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
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

		// クエリパラメータの除去
		var imageUrlObj = new URL(imageUrl);
		imageUrl = imageUrlObj.origin + imageUrlObj.pathname;

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

	/**
	 * ページの言語を取得する
	 * @returns ページの言語 (en, ja, etc.)
	 */
	function extractLang(){
		// html lang
		const lang = (document.documentElement.lang || "").trim();
		if (lang && lang.toLowerCase() !== "und") return lang.split("-")[0].toLowerCase();
		// meta http-equiv="content-language"
		const meta = document.querySelector('meta[http-equiv="content-language" i]');
		const metaLang = (meta?.getAttribute("content") || "").trim();
		if (metaLang) return metaLang.split(",")[0].split("-")[0].toLowerCase();
		// navigator.language
		return (navigator.language || "en").split("-")[0].toLowerCase();
	}
	
}


/*
 * 通知する
 */
function notifyExtension(data){
	browser.runtime.sendMessage(data);
}
