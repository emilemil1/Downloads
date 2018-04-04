/*eslint-env es6, jquery, browser*/

let nextData, slideShowGridItems = [], folderElements = [];

function returnNewEmptyGridItem() {
    return $(
        "<div class='sixteenbynine'>`\
            <div class='gallery-image' thumbnailIndex='0'>\
                <div class='image-download hover'>\
                <form method='get' class='button-form'>\
                    <input type='button' class='download-button' value='Please Wait...'>\
                </form>\
                </div>\
                <div class='image-bar'>\
                    <span class='image-tooltip'></span>\
                    <span class='image-tooltip-extra'></span>\
                </div>\
            </div>\
        </div>");
}

function returnNewEmptyDownloadBox() {
    return $("<div class='download-box'>\
                <div class='title'></div>\
                <div class='images'><b>Images</b></div>\
                <div class='files'><b>Tracks</b></div>\
                <div class='image-list'></div>\
                <div class='file-list'></div>\
             </div>");
}

function createImageDownloadButton(imageData) {
    let form = $("<form method='GET' class='button-form'></form>");
    let button = $("<input type='submit' class='download-button'></input>");
    button.appendTo(form);

    let url = imageData["@content.downloadUrl"] + "/" + getFilename(imageData);
    let value = "Download Image";
    let type = getFilenameType(imageData);
    if (!isNaN(type)) {
        value += " " + type;
        url = url.substring(0, url.lastIndexOf(".")) + " " + type + url.substring(url.lastIndexOf("."));
    }
    form.attr("action", url);
    button.attr("value", value);

    return form;
}

function createFileDownloadButton(fileData) {
    let form = $("<form method='GET' class='button-form'></form>");
    let button = $("<input type='submit' class='download-button'></input>");
    button.appendTo(form);

    let url = fileData["@content.downloadUrl"] + "/" + getFilename(fileData);
    let value = "Download " + getFilenameType(fileData);
    form.attr("action", url);
    button.attr("value", value);

    return form;
}

function slideShow() {
    for (let i = 0; i < slideShowGridItems.length; i++) {
        slideShowGridItems[i].thumbnailIndex = (slideShowGridItems[i].thumbnailIndex + 1) % (slideShowGridItems[i].thumbnails.length);
        let img = new Image();
        img.onload = function() {
            slideShowGridItems[i].css("background-image", "url(" + img.src + ")");
        }
        img.src = slideShowGridItems[i].thumbnails[slideShowGridItems[i].thumbnailIndex];
    }
}

function addGridItem(folder) {
    let title = folder.name.split("(")[0];
    let thumbnails = [];
    for (let i = 0; i < folder.thumbnails.length; i++) {
        thumbnails.unshift(folder.thumbnails[i].large.url);
    }

    let root = returnNewEmptyGridItem();
    let element = root.children(".gallery-image");
    element.children(".image-bar").children(".image-tooltip").prepend(title);
    element.css("background-image", "url("+ thumbnails[0] +")");
    element.thumbnails = thumbnails;
    element.thumbnailIndex = 0;
    element.id = folder.id;
    element.hasMetadata = false;

    if (thumbnails.length > 1) {
        slideShowGridItems.push(element);
    }

    root.appendTo(".grid");

    return element;
}

function getFilenameType(fileData) {
    if (fileData.image !== undefined) {
        return parseInt(fileData.name.substring(fileData.name.lastIndexOf(" "), fileData.name.indexOf(".")));
    } else {
        let filename = fileData.name.split(".")[0];
        let fileEnding = fileData.name.substring(fileData.name.indexOf("."));
        if (filename.endsWith(" (Original)")) {
            return "Original";
        } else if (filename.endsWith(" (Video Edit)")) {
            return "Video Edit";
        } else if (filename.endsWith(" (Nightcore)")) {
            return "Nightcore";
        }
    }
}

function getFilename(fileData) {
    if (fileData.image !== undefined) {
        return fileData.parentReference.name + fileData.name.substring(fileData.name.indexOf("."));
    } else {
        let filename = fileData.name.split(".")[0];
        let fileEnding = fileData.name.substring(fileData.name.indexOf("."));
        if (filename.endsWith(" (Original)")) {
            filename = filename.split(" (Original)")[0]
        }
        return filename + fileEnding;
    }
}

function getTrackname(filename) {
    filename = filename.split(".")[0];
    if (filename.endsWith(" (Nightcore)")) {
        filename = filename.split(" (Nightcore)")[0]
    } else if (filename.endsWith(" (Video Edit)")) {
        filename = filename.split(" (Video Edit)")[0]
    }
    return filename;
}

function expandDownloads(event) {
    let element = $($.Event(event).target.parentNode.parentNode.parentNode);
    element.children(".image-download").on("transitionend", function() {
        element.children(".image-download").off("transitionend");
        element.mouseleave(unexpandDownloads);
    })
    element.children(".download-box").css("height", element.children(".image-download").css("height"));
    element.css("grid-template-rows", "0fr 2rem");
    element.children(".image-download").css("height", "0px");
    element.children(".image-download").removeClass("hover");
    element.children(".image-bar").css("background-color", "rgb(0,0,0,0.9)");
    element.children(".image-download").children(".button-form").children(".download-button").css("display", "none");
}

function unexpandDownloads(event) {
    let element = $($.Event(event).currentTarget);
    element.off("mouseleave");
    element.css("grid-template-rows", "1fr 2rem");
    element.children(".image-download").css("height", element.height() - element.children(".image-bar").height());
    element.children(".image-download").addClass("hover");
    element.children(".image-bar").css("background-color", "rgb(0,0,0,0.5)");
    element.children(".image-download").children(".button-form").children(".download-button").css("display", "initial");
}

function prepareFolderMetaData(folderElement) {
    folderElement.images = [];
    folderElement.files = [];
    let folderUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/items/" + folderElement.id + "/children";
    $.get(folderUrl, function(data) {
        console.log(data);
        for (let i = 0; i < data.value.length; i++) {
            if(data.value[i].image !== undefined) {
                folderElement.images.push(data.value[i]);
            } else {
                folderElement.files.push(data.value[i]);
            }
        }

        let extra = "&nbsp;- ";

        if (data.value.length === 1) {
            extra += folderElement.images[0].image.width + "x" + folderElement.images[0].image.height;
            folderElement.children(".image-download").children(".button-form").attr("action", folderElement.images[0]["@content.downloadUrl"] + "/" + getFilename(folderElement.images[0]));
            folderElement.children(".image-download").children(".button-form").children(".download-button").attr("value", "Download Image");
            folderElement.children(".image-download").children(".button-form").children(".download-button").attr("type", "submit");
        } else {
            let downloadBox = returnNewEmptyDownloadBox();

            extra += folderElement.images.length + " Image";
            if (folderElement.images.length > 1) { extra += "s" }
            extra += " / " + folderElement.files.length + " Track";
            if (folderElement.files.length > 1) { extra += "s" }
            downloadBox.children(".title").html(getTrackname(getFilename(folderElement.files[0])));
            downloadBox.appendTo(folderElement);

            function unexpandPrevention(event) {
                folderElement.off("mouseleave");
                $(window).blur(function() {
                    $(window).off("blur");
                    folderElement.mousemove(function() {
                        folderElement.off("mousemove");
                        folderElement.mouseleave(unexpandDownloads);
                    });
                })
            }

            for (let i = 0; i < folderElement.images.length; i++) {
                let form = createImageDownloadButton(folderElement.images[i]);
                form.appendTo(downloadBox.children(".image-list"));
                form.children(".download-button").click(unexpandPrevention);
            }

            folderElement.files.sort(function(e1, e2) {
                function nameToNumber(name) {
                    if (name === "Original") {return 1}
                    if (name === "Video Edit") {return 2}
                    if (name === "Nightcore") {return 3}
                }
                let name1 = nameToNumber(getFilenameType(e1));
                let name2 = nameToNumber(getFilenameType(e2));

                return (name1 > name2);
            });

            for (let i = 0; i < folderElement.files.length; i++) {
                let form = createFileDownloadButton(folderElement.files[i]);
                form.appendTo(downloadBox.children(".file-list"));
                form.children(".download-button").click(unexpandPrevention);
            }

            folderElement.children(".image-download").children(".button-form").children(".download-button").attr("value", "View Downloads");
            folderElement.children(".image-download").children(".button-form").children(".download-button").attr("onclick", "expandDownloads(event)");
        }
        folderElement.children(".image-bar").children(".image-tooltip-extra").append(extra);
    });
}

function prepareFoldersMetaData() {
    for (let i = 0; i < folderElements.length; i++) {
        if (folderElements[i].hasMetadata === false) {
            prepareFolderMetaData(folderElements[i]);
            folderElements[i].hasMetadata = true;
            folderElements[i].children(".image-download").css("height", folderElements[i].height() - folderElements[i].children(".image-bar").height());
        }
    }
}

function fillGrid(folders, count = folders.length) {
    for (let i = 0; i < count; i++) {
        if(folders[i].name !== "Mix" && folders[i].folder !== undefined) {
            folderElements.push(addGridItem(folders[i]));
        }
    }
    $(window).resize(function() {
        for (let i = 0; i < folderElements.length; i++) {
            let trans = folderElements[i].children(".image-download").css("transition");
            folderElements[i].children(".image-download").addClass("no-transition");
            folderElements[i].children(".image-download").css("height", folderElements[i].height() - folderElements[i].children(".image-bar").height());
            folderElements[i].children(".image-download")[0].offsetHeight;
            folderElements[i].children(".image-download").removeClass("no-transition");
            folderElements[i].children(".image-download").css("transition", trans);
        }
    });
}

function galleryInit() {
    let galleryUrl = "https://api.onedrive.com/v1.0/shares/s!AqeaU-N5JvJ_gYJLVTUOUyNy1NFPHA/root/children?orderby=createdDateTime desc&expand=thumbnails&top=50";
    $.get(galleryUrl, function(data) {
        console.log(data);
        $(".loading").remove();
        nextData = data['@odata.nextLink'];
        fillGrid(data.value, 8);
        prepareFoldersMetaData();
    });

    setInterval(slideShow, 7000);
}

$(document).ready(galleryInit());
