var isDisabled = false;
var editor = null;

function updateDisabled(disabled) {
	if (tinymce) {
		if (disabled) {
			tinymce.activeEditor.setMode("readonly");
		} else {
			tinymce.activeEditor.setMode("design");
		}
	}
	isDisabled = disabled;
}

function initializeEditor(initialValue, isDisabled, config) {
	document.getElementById("editor").value = initialValue;

	// Setup SimpleMDE
	editor = tinymce.init({
		selector: "#editor",
		height: 500,
		menubar: false,
		external_plugins: {
			mathjax:
				"https://cdn.jsdelivr.net/npm/@dimakorotkov/tinymce-mathjax@1.0.7/plugin.min.js",
		},
		plugins: [
			"advlist autolink lists link image charmap print preview anchor mathjax",
			"searchreplace visualblocks code fullscreen",
			"insertdatetime media table paste code help wordcount",
		],
		mathjax: {
			lib: "https://cdn.jsdelivr.net/npm/mathjax@3.2.1/es5/tex-mml-svg.js",
		},
		toolbar:
			"undo redo | formatselect | bold italic underline | alignleft aligncenter alignright alignjustify | image media customKontentItemButton mathjax | bullist numlist outdent indent | code removeformat | help",
		tinycomments_mode: "embedded",
		file_picker_types: "file image media",
		file_picker_callback: filePickerCallback,
		// images_upload_handler: uploadImageCallback,
		image_caption: true,
		setup: function (editor) {
			// updates Kentico Cloud element value on certain actions
			editor.on("Paste Change input Undo Redo", function () {
				setValue(editor.getContent());
			});
			// update size & disabled mode once editor is loaded
			editor.on("init", function (args) {
				updateSize(editor.editorContainer.clientHeight);
				updateDisabled(isDisabled);
			});

			// add custom button for selecting Kontent item
			editor.ui.registry.addButton("customKontentItemButton", {
				icon: "non-breaking",
				tooltip: "Insert Kontent Item",
				disabled: true,
				onAction: async function (_) {
					const contentRefs = await CustomElement.selectItems({
						allowMultiple: false,
					});
					const contentItems = await CustomElement.getItemDetails(
						contentRefs.map((ar) => ar.id)
					);
					contentItems.forEach(async (item) => {
						if (item.type.codename === "action") {
							// Better to create a resolver from an API (in case of Next.js)
							const response = await fetch(
								`https://deliver.kontent.ai/64dd3be6-186e-02f9-712d-56e04c283cbd/items/${item.codename}`
							);
							const json = await response.json();
							editor.insertContent(
								`<a href='#'>${json.item.elements.label.value}</a>`
							);
						} else {
							alert(
								`Handler for ${item.type.codename} has not been implemented`
							);
						}
					});
				},
				onSetup: function (buttonApi) {
					var editorEventCallback = function (eventApi) {
						buttonApi.setDisabled(
							eventApi.element.nodeName.toLowerCase() === "time"
						);
					};

					editor.on("NodeChange", editorEventCallback);

					/* onSetup should always return the unbind handlers */
					return function (buttonApi) {
						editor.off("NodeChange", editorEventCallback);
					};
				},
			});
		},
		...config,
	});
}

function updateSize(height) {
	// Update the custom element height in the Kentico UI.
	CustomElement.setHeight(height);
}

function setValue(value) {
	// Send updated value to Kentico (send null in case of the empty string => element will not meet required condition).
	CustomElement.setValue(value || null);
}

function initCustomElement() {
	try {
		CustomElement.init((element, _context) => {
			// Setup with initial value and disabled state
			initializeEditor(element.value, element.disabled, element.config);
		});

		// React on disabled changed (e.g. when publishing the item)
		CustomElement.onDisabledChanged(updateDisabled);
	} catch (err) {
		// Initialization with Kentico Custom element API failed (page displayed outside of the Kentico UI)
		console.error(err);
		initializeEditor(err.toString());
	}
}

async function filePickerCallback(callback, value, meta) {
	console.log(
		"🚀 ~ file: index.html ~ line 126 ~ filePickerCallback ~ meta",
		meta
	);
	const assetRefs = await CustomElement.selectAssets({
		allowMultiple: false,
		fileType: meta.filetype === "image" ? "images" : "all",
	});
	const assets = await CustomElement.getAssetDetails(
		assetRefs.map((ar) => ar.id)
	);

	assets.forEach((asset) => {
		callback(asset.url, {
			...asset,
			alt: asset.descriptions[0]?.description,
		});
	});
}

// If we want to upload to imgur
// function uploadImageCallback(file, success, failure) {
//     var xhr = new XMLHttpRequest();
//     // using webcodatech@gmail.com client id
//     xhr.open('POST', 'https://api.imgur.com/3/image');
//     xhr.setRequestHeader('Authorization', 'Client-ID d3e14b7b5c3f235');

//     xhr.addEventListener('load', function() {
//         var json = JSON.parse(xhr.responseText);
//         success(json.data.link);
//     });
//     xhr.addEventListener('error', function() {
//         JSON.parse(xhr.responseText);
//         failure(xhr.responseText);
//     });

//     var data = new FormData();
//     var blob = file.blob();
//     data.append('image', blob);
//     xhr.send(data);
// };

initCustomElement();
