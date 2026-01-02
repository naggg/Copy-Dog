/*
 * 右クリックメニューの作成
 */
browser.contextMenus.create({
	id: "copyDog",
	title: "Copy Dog",
	contexts: ["page"]
});


/*
 * 右クリックメニューのクリック処理
 */
browser.contextMenus.onClicked.addListener((info, tab) => {
	if(info.menuItemId === "copyDog"){
		var scriptToExecute = "copyPageInfo();";
		var executing = browser.tabs.executeScript({
			code: scriptToExecute
		});
		executing.then(onExecutionSuccess, onExecutionError);
	}
});


/*
 * ショートカットキーの対応
 */
browser.commands.onCommand.addListener((command) => {
	var scriptToExecute;

	if(command === "copyPageInfo"){
		scriptToExecute = "copyPageInfo();";
	}else if(command === "CopyPageTitleAndURLWithTime"){
		scriptToExecute = "copyPageTitleAndURLWithTime();";
	}

	if(scriptToExecute){
		var executing = browser.tabs.executeScript({
			code: scriptToExecute
		});
		executing.then(onExecutionSuccess, onExecutionError);
	}
});


/*
 * コンテントスクリプトからの対応
 */
browser.runtime.onMessage.addListener(notify);


/*
 * スクリプト実行成功時のハンドラー
 */
function onExecutionSuccess(result) {
	// なにもしない
	//console.log(result);
}


/*
 * スクリプト実行エラー時のハンドラー
 */
function onExecutionError(error) {
	console.log(`Error: ${error}`);
	notify({result:"error", message:`Error: ${error}`});
}


/*
 * ブラウザへ通知を行う
 */
function notify(data){
	browser.notifications.create({
		"type": "basic",
		"iconUrl": browser.runtime.getURL("icons/link-48.png"),
		"title": "Copy Dog 🐶",
		"message": data.message
	});
}