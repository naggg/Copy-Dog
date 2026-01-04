var EXTENSION_NAME = "Copy Dog";

// ブラウザAPI判定
var isFirefox = typeof browser !== "undefined";
var browserAPI = isFirefox ? browser : chrome;


/*
 * 右クリックメニューの作成
 */
browserAPI.contextMenus.create({
	id: "copyDog",
	title: EXTENSION_NAME,
	contexts: ["page"]
});


/*
 * 右クリックメニューのクリック処理
 */
browserAPI.contextMenus.onClicked.addListener((info, tab) => {
	if(info.menuItemId === "copyDog"){
		var scriptToExecute = "copyPageInfo();";
		executeScript(tab.id, scriptToExecute);
	}
});


/*
 * ショートカットキーの対応
 */
browserAPI.commands.onCommand.addListener(function(command) {
	var scriptToExecute;

	if(command === "copyPageInfo"){
		scriptToExecute = "copyPageInfo();";
	}

	if(scriptToExecute){
		browserAPI.tabs.query({active: true, currentWindow: true}, function(tabs) {
			if(!isFirefox && chrome.runtime && chrome.runtime.lastError){
				onExecutionError(chrome.runtime.lastError);
				return;
			}
			if(tabs && tabs[0]){
				executeScript(tabs[0].id, scriptToExecute);
			}else{
				onExecutionError("No active tab found");
			}
		});
	}
});


/*
 * スクリプトを実行する（ブラウザ判定付き）
 */
function executeScript(tabId, code) {
	if(isFirefox){
		// Firefox: Promise形式（Manifest V2）
		var executing = browser.tabs.executeScript(tabId, {
			code: code
		});
		executing.then(onExecutionSuccess, onExecutionError);
	}else{
		// Chrome: Manifest V3では chrome.scripting.executeScript を使用
		if(chrome.scripting && chrome.scripting.executeScript){
			// Manifest V3: まずメッセージを送ってみる
			chrome.tabs.sendMessage(tabId, {action: "copyPageInfo"}, function(response) {
				if(chrome.runtime.lastError){
					// content scriptがまだ読み込まれていない可能性がある
					// chrome.scripting.executeScriptでcontent scriptを注入してから実行
					chrome.scripting.executeScript({
						target: { tabId: tabId },
						files: ["content/content.js"]
					}, function() {
						if(chrome.runtime.lastError){
							onExecutionError(chrome.runtime.lastError);
						}else{
							// 注入後、少し待ってからメッセージを送る
							setTimeout(function() {
								chrome.tabs.sendMessage(tabId, {action: "copyPageInfo"}, function(response2) {
									if(chrome.runtime.lastError){
										onExecutionError(chrome.runtime.lastError);
									}else{
										onExecutionSuccess(response2);
									}
								});
							}, 200);
						}
					});
				}else{
					onExecutionSuccess(response);
				}
			});
		}else{
			// Manifest V2（フォールバック）
			chrome.tabs.executeScript(tabId, {
				code: code
			}, function(result) {
				if(chrome.runtime.lastError){
					onExecutionError(chrome.runtime.lastError);
				}else{
					onExecutionSuccess(result);
				}
			});
		}
	}
}


/*
 * スクリプト実行成功時のハンドラー
 */
function onExecutionSuccess(result){
	// do nothing
}


/*
 * スクリプト実行エラー時のハンドラー
 */
function onExecutionError(error){
	var errorMessage = (error && error.message) ? error.message : String(error);
	showNotification({result:"error", message:`Error: ${errorMessage}`});
}


/*
 * ブラウザへ通知を行う
 */
function showNotification(data){
	var notificationOptions = {
		"type": "basic",
		"iconUrl": browserAPI.runtime.getURL("icons/icon-48.png"),
		"title": EXTENSION_NAME,
		"message": data.message || "Unknown message"
	};	
	browserAPI.notifications.create(notificationOptions);
}


/*
 * コンテントスクリプトからの対応
 */
browserAPI.runtime.onMessage.addListener(function(request, sender, sendResponse){
	// content scriptからの通知メッセージのみ処理
	if(request && (request.result === "success" || request.result === "error")){
		showNotification(request);
	}
	// 他のメッセージは無視
	return false;
});
