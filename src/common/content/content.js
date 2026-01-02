/*
 * ページのタイトルとURLをクリップボードにコピーする
 */
function copyPageInfo(e){
	
	// URL
	var url = window.location.href;

	// Amazonの場合は、URLを短縮化する
	if(url.match(/amazon\.co\.jp/)) url = url.replace(/https:\/\/www\.amazon\.co\.jp\/.*\/dp\/([A-Z0-9]+).*$/, 'https://www.amazon.co.jp/dp/$1/');

	// 対象文字列
	var data = document.title + "\n" + url;

	// コピペの実行、結果を backgrond.js に戻して、通知する
	navigator.clipboard.writeText(data)
	.then(() => {
		notifyExtension({result: "success", message: data});
	})
	.catch(err => {
		notifyExtension({result: "error", message: "ユーザが拒否、もしくはなんらかの理由で失敗しました。"});
	});
	
}


/*
 * 通知する
 */
function notifyExtension(data){
	browser.runtime.sendMessage(data);
}
