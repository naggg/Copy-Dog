// デフォルトフォーマットの定義
const defaultFormats = {
	default1: "$title\n$url",
	default2: "$title ($date)\n$url",
	default3: "[$title]($url)",
	default4: "[$title]($url) ($date)"
};

// 設定のデフォルト値
const defaultSettings = {
	formatType: "default1",
	customFormat: "$title\n$url"
};

// ページ読み込み時に設定を読み込む
document.addEventListener("DOMContentLoaded", loadSettings);

// 保存ボタンのクリックイベント
document.getElementById("saveButton").addEventListener("click", saveSettings);

// フォーマットタイプの変更イベント
document.querySelectorAll('input[name="formatType"]').forEach(radio => {
	radio.addEventListener("change", function() {
		var customContainer = document.getElementById("customFormatContainer");
		if (this.value === "custom") {
			customContainer.style.display = "block";
		} else {
			customContainer.style.display = "none";
		}
	});
});

// 設定を読み込む
function loadSettings() {
	browser.storage.local.get(defaultSettings).then(function(items) {
		// ラジオボタンの設定
		var formatType = items.formatType || "default1";
		document.querySelector(`input[name="formatType"][value="${formatType}"]`).checked = true;

		// カスタムフォーマットの設定
		document.getElementById("customFormat").value = items.customFormat || defaultSettings.customFormat;

		// カスタムフォーマットの表示/非表示
		var customContainer = document.getElementById("customFormatContainer");
		if (formatType === "custom") {
			customContainer.style.display = "block";
		} else {
			customContainer.style.display = "none";
		}
	});
}

// 設定を保存する
function saveSettings() {
	var settings = {
		formatType: document.querySelector('input[name="formatType"]:checked').value,
		customFormat: document.getElementById("customFormat").value
	};

	browser.storage.local.set(settings).then(function() {
		var saveMessage = document.getElementById("saveMessage");
		saveMessage.textContent = "保存しました";
		saveMessage.className = "save-message success";
		
		setTimeout(function() {
			saveMessage.textContent = "";
			saveMessage.className = "save-message";
		}, 2000);
	});
}

